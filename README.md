OS Memory Management Simulator:

An interactive, web-based tool designed to visualize core operating system memory management concepts, specifically focusing on Page Replacement Policies. Built with a modular JavaScript architecture, the application uses the Canvas API to provide a dynamic, step-by-step demonstration of algorithmic behavior, all styled with a high-contrast Cyberpunk aesthetic.

Live Demo:

You can view the live simulation here:
https://eggsysy.github.io/os_project/

Features

Four Algorithms: Supports four fundamental page replacement algorithms for comparative analysis:

FIFO (First-In, First-Out)

LRU (Least Recently Used)

Optimal (Future Knowledge)

Clock (Second Chance)

Real-time Visualization: Uses the HTML Canvas to dynamically draw memory frames, page IDs, and algorithm-specific indicators (FIFO/Clock pointers, LRU age counters).

Interactive Controls: Full control over the simulation timeline with Play/Pause, Step Forward (FWD), and Step Backward (BACK) functionality.

Dynamic Metrics: Tracks and displays real-time statistics, including Total References, Page Hits, Page Faults, and the calculated Hit Ratio.

Cyberpunk Aesthetic: Features a dark background, Neon Cyan accents (#00ffff), high-contrast text, and a monospace font for a professional and engaging user experience.

Project Structure

The project is structured modularly for clarity and maintainability, leveraging ES6 imports:

index.html: The main entry point and UI structure. It defines the layout, loads the necessary resources (Tailwind CSS, custom styles), and imports the main app.js module.

styles.css: The presentation layer. Contains all custom CSS rules for the high-contrast Cyberpunk theme, including font imports, background patterns, and interactive hover effects.

algorithms.js: The core logic module. Contains the pure, functional implementations for all four page replacement policies (FIFO, LRU, Optimal, Clock) which generate the simulation trace.

app.js: The application controller. This module handles global state, processes user input, manages UI event listeners, controls the animation loop, draws the visualization on the Canvas, and calculates/displays statistics.

README.md: This documentation file.

How to Run Locally:

Since this project uses modular JavaScript (import statements), it must be served via a local HTTP server to avoid browser security restrictions. Choose the method that best suits your environment:

Using Python's Simple HTTP Server (General Utility)

This server is available on most systems with Python 3 installed.

Open your terminal or command prompt and navigate to the root directory of this project (where index.html is located).

Run the following command:

python -m http.server 8000


Open your web browser and navigate to: http://localhost:8000



The app will open automatically in your browser, typically at http://localhost:8080.
