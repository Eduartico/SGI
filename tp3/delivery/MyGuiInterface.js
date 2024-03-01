import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MyApp } from './MyApp.js';
import { MyContents } from './MyContents.js';

/**
 * This class customizes the gui interface for the app
 */
class MyGuiInterface {

    /**
     *
     * @param {MyApp} app The application object
     */
    constructor(app) {
        this.app = app
        this.datgui = new GUI();
        this.closeButton = null;
        this.usernameInput = null;
        this.playerCarDropdown = null;
        this.opponentCarDropdown = null;
        this.isDestroyed = false;
        this.countdownOver = false;
        this.enemyLap = 0;
        this.currentLap = 0;
        this.elapsedTime = 0;
    }

    /**
     * Initialize the gui interface
     */
    init() {
        this.datgui.domElement.style.position = 'absolute';
        this.datgui.domElement.style.top = '0';
        this.datgui.domElement.style.left = '0';
        this.datgui.domElement.style.width = '100%';
        this.datgui.domElement.style.height = '100%';

        const titleDiv = document.createElement('div');
        titleDiv.innerHTML = '<h1 style="font-size: 36px; margin-bottom: 15px;">Cyber Race</h1>';
        titleDiv.style.textAlign = 'center';
        titleDiv.style.color = 'white';
        titleDiv.style.position = 'absolute';
        titleDiv.style.top = '50px';
        titleDiv.style.width = '100%';
        this.datgui.domElement.appendChild(titleDiv);

        const authorsDiv = document.createElement('div');
        authorsDiv.innerHTML = '<p>Authors: Adam Nogueira and Eduardo Duarte, FEUP SGI</p>';
        authorsDiv.style.textAlign = 'center';
        authorsDiv.style.color = 'white';
        authorsDiv.style.position = 'absolute';
        authorsDiv.style.top = '100px';
        authorsDiv.style.width = '100%';
        this.datgui.domElement.appendChild(authorsDiv);

        this.usernameInput = document.createElement('input');
        this.usernameInput.type = 'text';
        this.usernameInput.placeholder = 'Enter your username';
        this.usernameInput.style.position = 'absolute';
        this.usernameInput.style.top = '130px';
        this.usernameInput.style.left = '50%';
        this.usernameInput.style.maxWidth = '25%';
        this.usernameInput.style.transform = 'translateX(-50%)';
        this.datgui.domElement.appendChild(this.usernameInput);

        const playerCarLabel = document.createElement('div');
        playerCarLabel.innerHTML = '<p>Select your car:</p>';
        playerCarLabel.style.textAlign = 'center';
        playerCarLabel.style.color = 'white';
        playerCarLabel.style.position = 'absolute';
        playerCarLabel.style.top = '160px';
        playerCarLabel.style.width = '100%';
        this.datgui.domElement.appendChild(playerCarLabel);

        this.playerCarDropdown = document.createElement('select');
        this.playerCarDropdown.innerHTML = '<option value="Auda">Auda</option><option value="Teslo">Teslo</option>';
        this.playerCarDropdown.style.position = 'absolute';
        this.playerCarDropdown.style.top = '190px';
        this.playerCarDropdown.style.left = '50%';
        this.playerCarDropdown.style.width = '100%';
        this.playerCarDropdown.style.maxWidth = '25%';
        this.playerCarDropdown.style.transform = 'translateX(-50%)';
        this.datgui.domElement.appendChild(this.playerCarDropdown);

        const opponentCarLabel = document.createElement('div');
        opponentCarLabel.innerHTML = '<p>Select opponent\'s car:</p>';
        opponentCarLabel.style.textAlign = 'center';
        opponentCarLabel.style.color = 'white';
        opponentCarLabel.style.position = 'absolute';
        opponentCarLabel.style.top = '220px';
        opponentCarLabel.style.width = '100%';
        this.datgui.domElement.appendChild(opponentCarLabel);

        this.opponentCarDropdown = document.createElement('select');
        this.opponentCarDropdown.innerHTML = '<option value="Teslo">Teslo</option><option value="Auda">Auda</option>';
        this.opponentCarDropdown.style.position = 'absolute';
        this.opponentCarDropdown.style.top = '250px';
        this.opponentCarDropdown.style.left = '50%';
        this.opponentCarDropdown.style.maxWidth = '25%';
        this.opponentCarDropdown.style.width = '100%';
        this.opponentCarDropdown.style.transform = 'translateX(-50%)';
        this.datgui.domElement.appendChild(this.opponentCarDropdown);

        const difficultyLabel = document.createElement('div');
        difficultyLabel.innerHTML = '<p>Select difficulty:</p>';
        difficultyLabel.style.textAlign = 'center';
        difficultyLabel.style.color = 'white';
        difficultyLabel.style.position = 'absolute';
        difficultyLabel.style.top = '280px';
        difficultyLabel.style.width = '100%';
        this.datgui.domElement.appendChild(difficultyLabel);

        this.difficultyDropdown = document.createElement('select');
        this.difficultyDropdown.innerHTML = '<option value="easy">Easy</option><option value="hard">Hard</option>';
        this.difficultyDropdown.style.position = 'absolute';
        this.difficultyDropdown.style.top = '310px';
        this.difficultyDropdown.style.left = '50%';
        this.difficultyDropdown.style.maxWidth = '25%';
        this.difficultyDropdown.style.width = '100%';
        this.difficultyDropdown.style.transform = 'translateX(-50%)';
        this.datgui.domElement.appendChild(this.difficultyDropdown);

        this.closeButton = document.createElement('button');
        this.closeButton.innerHTML = 'Start Game';
        this.closeButton.style.position = 'absolute';
        this.closeButton.style.bottom = '30px';
        this.closeButton.style.maxWidth = '25%';
        this.closeButton.style.left = '50%';
        this.closeButton.style.transform = 'translateX(-50%)';
        this.closeButton.addEventListener('click', () => this.closeGui());
        this.datgui.domElement.appendChild(this.closeButton);
        
        this.countdownText = document.createElement('div');
        this.countdownText.style.position = 'absolute';
        this.countdownText.style.top = '50%';
        this.countdownText.style.left = '50%';
        this.countdownText.style.transform = 'translate(-50%, -50%)';
        this.countdownText.style.fontSize = '100px';
        this.countdownText.style.color = 'red';
        this.countdownText.style.fontFamily = 'Arial';
        document.body.appendChild(this.countdownText);

        this.gameOverDiv = document.createElement('div');
        this.gameOverDiv.style.position = 'absolute';
        this.gameOverDiv.style.top = '50%';
        this.gameOverDiv.style.left = '50%';
        this.gameOverDiv.style.transform = 'translate(-50%, -50%)';
        this.gameOverDiv.style.fontSize = '50px';
        this.gameOverDiv.style.color = 'red';

        document.body.appendChild(this.gameOverDiv);
    }

    /**
     * Close the GUI
     */
    closeGui() {
        const selectedPlayerCar = this.playerCarDropdown.value;
        const selectedOpponentCar = this.opponentCarDropdown.value;
         const selectedDifficulty = this.difficultyDropdown.value;
        
        this.app.username = this.usernameInput.value;
        this.app.playerCar = selectedPlayerCar;
        this.app.opponentCar = selectedOpponentCar;
        this.app.difficulty = selectedDifficulty;

        this.datgui.destroy();
        this.isDestroyed = true;
        this.startCountdown();
    };

    startCountdown() {
        setTimeout(() =>{
            // Create a new GUI for the countdown
            this.datgui = new GUI();

            this.countdownText.style.display = 'none';
        
            // Set the initial count
            let count = 3;

            // Function to update the countdown
            const updateCountdown = () => {
                if (count >= 1) {
                    // Display the countdown text
                    this.countdownText.innerHTML = count;

                    // Decrement the count
                    count--;

                    // Schedule the next update
                    setTimeout(updateCountdown, 1000);
                } else {
                    // Countdown is complete, hide the countdown text
                    this.countdownText.style.display = 'none';

                    // Add your logic to start the race here
                    console.log('Race started!');
                    this.datgui.destroy();
                    this.startGameRunningGUI();
                    this.countdownOver = true;
                }
            };

            // Display the countdown text
            this.countdownText.style.display = 'block';

            // Start the initial countdown
            
            updateCountdown();
        }, 2000)
    };

    startGameRunningGUI(){
        this.datgui = new GUI();
        this.lapContainer = this.datgui.addFolder('Race Information');
        this.lapContainer.add(this, 'currentLap').name('Your Lap').listen();
        this.lapContainer.add(this, 'enemyLap').name('Enemy Lap').listen();
        this.lapContainer.add(this, 'elapsedTime').name('Elapsed Time (s)').listen();
    }
      
    update(){
        if(!this.app.clock)
            return
        this.currentLap = this.app.currentLap;
        this.enemyLap = this.app.enemyLap;
        this.elapsedTime = this.app.clock.elapsedTime.toFixed(1);
    }

    gameOver(){
        if(this.datgui)
            this.datgui.destroy()

        this.gameOverDiv.style.display = 'block';

        // Determine whether the player wins or loses
        const winCondition = this.app.currentLap > 3;
        
        // Display the result in big red or green letters
        const resultText = winCondition ? 'You Win' : 'You Lose';
        this.gameOverDiv.innerHTML = resultText;
        this.gameOverDiv.style.color = winCondition ? 'green' : 'red';
    }

}


export { MyGuiInterface };
