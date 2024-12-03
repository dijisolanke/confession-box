import React from "react";
import VideoChat from "./components/VideoChat";
import process from "process";
window.process = process;

function App() {
  return (
    <div className="App">
      <VideoChat />
    </div>
  );
}

export default App;
