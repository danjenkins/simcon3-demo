import React from 'react';
import ReactDOM from "react-dom";
import './App.css';
// import { Map, GoogleApiWrapper, Marker, InfoWindow, Circle } from 'google-maps-react';
import { GoogleMap, LoadScript, Circle, Marker, InfoWindow } from '@react-google-maps/api'
import SipClient from './lib/SipClient';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import PhoneIcon from '@material-ui/icons/Phone';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';

import { Nuke } from 'mdi-material-ui';

const ACCOUNT_NUMBER = 'account-id';
const USER = 'api-username';
const PASS = 'api-password';
const TRUNK = 'trunk';
const NGROK_BASE_URI = 'https://foo.ngrok.io';

const mapStyles = {
    width: '100%',
    height: '100%',
    position: 'absolute'
};

class Game extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            stores: [
                { lat: 48.148598, lng: 17.107748, place: 'Bratislava, Slovakia', number: '421543211222', detonated: false, call: null, audio: null },
                { lat: -33.447487, lng: -70.673676, place: 'Santiago, Chile', number: '56225708459', detonated: false, call: null, audio: null },
                { lat: 40.783058, lng: -73.971252, place: 'New York, USA', number: '13322088912', detonated: false, call: null, audio: null },
                { lat: -34.603722, lng: -58.381592, place: 'Buenos Aires, Argentina', number: '541159842800', detonated: false, call: null, audio: null },
                { lat: 52.237049, lng: 21.017532, place: 'Warsaw, Poland', number: '48221040979', detonated: false, call: null, audio: null },
                { lat: 51.509865, lng: -0.118092, place: 'London, UK', number: '442030263291', detonated: false, call: null, audio: null },
                { lat: 37.774929, lng: -122.419418, place: 'San Francisco, USA', number: '14153291935', detonated: false, call: null, audio: null }
            ],
            showingInfoWindow: false,
            activeMarker: {},
            selectedPlace: {},
        };

        this._sip = new SipClient({
            sipUri           : 'sip:webrtc1@sip.nimblea.pe',
            sipPassword      : 'webrtc1',
            wsUri            : 'wss://sip.nimblea.pe/ws',
            pcConfig         : {
                iceServers: [
                    {
                        urls: [ 'stun:stun.l.google.com:19302']
                    }
                ]
            }
        });

        this._sip.start();
    }

    componentDidMount () {
        this._boundOnSession = this.handleSession.bind(this);
        this._sip.on('session', this._boundOnSession);
    }

    async nukeSession (info) {
        //go get active calls
        const response = await fetch(`https://api.simwood.com/v3/voice/${ACCOUNT_NUMBER}/inprogress/current`, {
            method: 'GET', // *GET, POST, PUT, DELETE, etc.
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64'),
                'Content-Type': 'application/json'
            },
            credentials: 'omit',
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *client
        });
        const json = await response.json(); // parses JSON response into native JavaScript objects
        //find the right one
        console.log(json);
        let destroyed = false;
        json.channels.forEach(async (channel) => {
            console.log(channel.trunk, TRUNK, info.number, channel.to);
            if (!destroyed && info.number === channel.to) {
                //kill it
                console.log('killing channel', channel);
                const deleteResponse = await fetch(`${NGROK_BASE_URI}/kill/${channel.call_id}`, {
                    method: 'DELETE', // *GET, POST, PUT, DELETE, etc.
                    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    redirect: 'follow', // manual, *follow, error
                    referrerPolicy: 'no-referrer', // no-referrer, *client
                });
                destroyed = true;
                console.log(deleteResponse);
            }
        })

    }

    toggleMute(info) {
        info.audio.muted = !info.audio.muted;
    }

    call (info) {
        this._sip.call(info.number);
    }

    handleSession (session) {
        console.log(session);
        let calledNumber = session.jssipRtcSession.remote_identity._uri._user;


        this.setState((prevState) => {
            let stores = prevState.stores;
            //find the one that contains this calledNumber

            stores.map((dest, index) => {
                if (dest.number === calledNumber) {
                    return dest.call = session;
                }
            });

            return {
                ...prevState,
                stores
            }
        });

        session.on('newStream', (stream) => {

            //theres only one audio track from asterisk
            if (stream.getAudioTracks().length) {
                console.log('got a stream with audio track', stream);
                let remoteAudio = new Audio();
                remoteAudio.srcObject = stream;
                remoteAudio.play();

                this.setState((prevState) => {
                    let stores = prevState.stores;
                    //find the one that contains this calledNumber

                    stores.map((dest, index) => {
                        if (dest.number === calledNumber) {
                            dest.audio = remoteAudio;
                            return dest;
                        }
                    });

                    return {
                        ...prevState,
                        stores
                    }
                });
            }
        });

        session.on('streamRemoved', (stream) => {
            this.setState((prevState) => {
                let stores = prevState.stores;
                //find the one that contains this calledNumber

                stores.map((dest, index) => {
                    if (dest.number === calledNumber) {
                        dest.audio = null;
                        return dest;
                    }
                });

                return {
                    ...prevState,
                    stores
                }
            });
        });

        session.on('terminate', (endInfo) => {
            this.setState((prevState) => {
                let stores = prevState.stores;
                //find the one that contains this calledNumber

                stores.map((dest, index) => {
                    if (dest.number === calledNumber) {
                        dest.call = null;
                        dest.detonated = true;
                        return dest;
                    }
                });

                return {
                    ...prevState,
                    stores
                }
            });
        })
    }

    displayMarkers () {

        console.log('markers', this.props)

        return this.state.stores.map((dest, index) => {

            if (dest.detonated) {
                return (
                    <Circle
                        key={index}
                        center={{ lat: dest.lat, lng: dest.lng }}
                        options={{
                            strokeColor: '#FF0000',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            fillColor: '#FF0000',
                            fillOpacity: 0.35,
                            clickable: false,
                            draggable: false,
                            editable: false,
                            visible: true,
                            radius: 41200,
                            zIndex: 1
                        }}
                    />
                );
            }

            return (
                <Marker
                    key={index}
                    id={index}
                    title={dest.place}
                    position={{
                        lat: dest.lat,
                        lng: dest.lng
                    }}
                    onClick={(event) => {
                        this.setState({
                            selectedPlace: dest,
                            activeMarker: index,
                            showingInfoWindow: true
                          });
                    }}
                />
            );
        })
    }

    // onInfoWindowOpen (props, infoDest, e) {
    //     const buttons = (

    //     );
    //     ReactDOM.render(
    //       React.Children.only(buttons),
    //       document.getElementById("iwc")
    //     );
    // }

    render () {

        let infoDest = {};
        if (this.state.showingInfoWindow) {
            console.log(this.state);
            infoDest = this.state.stores[this.state.activeMarker];
        }

        console.log('map', this);

        return(
            <LoadScript
                id="script-loader"
                googleMapsApiKey="AIzaSyAhG1guik9WCXhAO_19IOK1viFwV3pdNYA"
            >
                <GoogleMap
                    id='example-map'
                    mapContainerStyle={mapStyles}
                    center={{
                        lat: 39.155627,
                        lng: 11.045634
                    }}
                    zoom={3.5}
                >
                    {this.displayMarkers()}
                    { this.state.showingInfoWindow && (
                        <InfoWindow
                            position={{lat: infoDest.lat, lng: infoDest.lng}}
                            // onLoad={infoWindow => {
                            //     this.onInfoWindowOpen(this.props, infoDest, infoWindow);
                            // }}
                            onCloseClick={() => {
                                this.setState({
                                    activeMarker: null,
                                    selectedPlace: null,
                                    showingInfoWindow: false
                                });
                            }}
                        >
                            <React.Fragment>
                                <Typography variant="h1" component="h2" gutterBottom>
                                    {infoDest.place}
                                </Typography>
                                { infoDest.call ?
                                    <IconButton
                                        onClick={() => {
                                            this.toggleMute(infoDest);
                                        }}
                                        aria-label="mute"
                                    >
                                        <VolumeOffIcon />
                                    </IconButton>
                                :
                                    <IconButton
                                        onClick={() => {
                                            this.call(infoDest);
                                        }}
                                        aria-label="call"
                                    >
                                        <PhoneIcon />
                                    </IconButton>
                                }
                                <IconButton
                                    onClick={() => {
                                        console.log('nuke it!');
                                        this.nukeSession(infoDest);
                                    }}
                                    aria-label="nuke"
                                >
                                    <Nuke />
                                </IconButton>
                            </React.Fragment>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </LoadScript>
            // <Map
            //     google={this.props.google}
            //     style={mapStyles}
            //     initialCenter={{
            //         lat: 39.155627,
            //         lng: 11.045634
            //     }}
            //     zoom={3.5}
            //     //disableDoubleClickZoom={true}
            //     //draggable={false}
            //     //scrollwheel={false}
            // >
            //     {this.displayMarkers()}
            //     <InfoWindow
            //         marker={this.state.activeMarker}
            //         onOpen={e => {
            //             this.onInfoWindowOpen(this.props, infoDest, e);
            //         }}
            //         onClose={(props, marker) => {
            //             this.setState({
            //                 selectedPlace: props,
            //                 activeMarker: marker,
            //                 showingInfoWindow: false
            //               });
            //         }}
            //         visible={this.state.showingInfoWindow}
            //     >
            //         <div id="iwc" />
            //     </InfoWindow>
            // </Map>
        )
    }
}

// export default GoogleApiWrapper({
//     apiKey: 'AIzaSyAhG1guik9WCXhAO_19IOK1viFwV3pdNYA'
// })(Game);

export default Game;