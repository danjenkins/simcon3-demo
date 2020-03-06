import React from 'react';
import './App.css';
import Typist from 'react-typist';
import Game from './Game';

class App extends React.Component {
  state = {
    renderMsg: false,
  }

  onHeaderTyped = () => {
    this.setState({ renderMsg: true });
  }

  render() {
    return (
      <div className="App">
        { this.state.renderMsg === false ?
          <header className="App-header">
            <Typist
              cursor={{
                show: true,
                blink: true,
                element: '|',
                hideWhenDone: false,
                hideWhenDoneDelay: 1000,
              }}
              avgTypingDelay={50}
              startDelay={3000}
              onTypingDone={this.onHeaderTyped}
            >
              GREETINGS PROFESSOR FALKEN
              <Typist.Delay ms={3000} />
              <br />
              LET'S PLAY A GAME OF GLOBAL THERMONUCLEAR WAR.
              <Typist.Delay ms={2000} />
              {''}
            </Typist>
          </header>
        :
          <Game />
        }
      </div>
    );
  };
}

export default App;
