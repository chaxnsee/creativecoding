# Shore of Hands

An interactive web artwork exploring freedom, memory, and impermanence through hand gestures and digital sand.

## Running the Artwork

This project uses modern web technologies (ES Modules, p5.js, and MediaPipe). Due to browser security restrictions on camera access and module loading, it must be served via a local web server (not just opening the file directly).

### Using Python (Recommended)

Since `npm` was unavailable in the environment, you can run this project using Python's built-in HTTP server:

1.  Open your terminal in this directory.
2.  Run the following command:
    ```bash
    python3 -m http.server 8000
    ```
3.  Open your browser to: [http://localhost:8000](http://localhost:8000)

### Interaction

*   **Allow Camera Access**: When prompted, allow the browser to access your webcam.
*   **Raise Hand**: Bring your hand into the frame. The digital sand will gather around your hand, forming structures.
*   **Hold**: Keep your hand steady to build.
*   **Release**: Remove your hand to let the waves wash the structures away.

## Technologies

*   **p5.js**: For creative coding and particle simulation.
*   **MediaPipe Hands**: For real-time, high-fidelity hand tracking running entirely in the browser.
*   **Vanilla JS/CSS**: For performance and seamless integration.
