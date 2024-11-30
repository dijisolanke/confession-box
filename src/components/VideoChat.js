import React, { useEffect, useRef, useState } from "react";
import {
  Container,
  VideoContainer,
  Video,
  Button,
  TextChat,
} from "../styles/VideoChatStyles";
import io from "socket.io-client";
import Peer from "simple-peer";

const VideoChat = () => {
  const [stream, setStream] = useState();
  const [chatActive, setChatActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");

  const userVideo = useRef();
  const partnerVideo = useRef();
  const connectionRef = useRef();
  const socketRef = useRef();

  useEffect(() => {
    // Connect to the server
    socketRef.current = io.connect(
      "https://confession-box-server.onrender.com"
    );

    // Get the user media stream (camera and microphone)
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      })
      .catch((err) => {
        console.error("Error accessing media devices:", err);
      });

    // WebSocket events
    socketRef.current.on("matched", ({ partnerId }) => {
      setChatActive(true);
      callUser(partnerId); // Call the matched user
    });

    socketRef.current.on("callUser", ({ signal }) => {
      answerCall(signal); // Answer incoming call
    });

    socketRef.current.on("callAccepted", (signal) => {
      connectionRef.current.signal(signal); // Accept the call and connect
    });

    socketRef.current.on("receiveMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      // Clean up when the component unmounts
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Start the call with the matched user
  const callUser = (partnerId) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    // Send the signal to the server
    peer.on("signal", (data) => {
      socketRef.current.emit("callUser", {
        userToCall: partnerId,
        signalData: data,
      });
    });

    // Receive partner's stream and display it
    peer.on("stream", (partnerStream) => {
      partnerVideo.current.srcObject = partnerStream;
    });

    connectionRef.current = peer;
  };

  // Answer the incoming call
  const answerCall = (incomingSignal) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    // Send the signal to the server that the call is accepted
    peer.on("signal", (data) => {
      socketRef.current.emit("answerCall", { signal: data });
    });

    // Receive partner's stream and display it
    peer.on("stream", (partnerStream) => {
      partnerVideo.current.srcObject = partnerStream;
    });

    // Signal the peer with the incoming signal
    peer.signal(incomingSignal);
    connectionRef.current = peer;
  };

  // Switch to next random chat by destroying the current peer connection
  const nextChat = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy(); // Destroy current peer connection
    }
    setChatActive(false);
    setMessages([]);
    socketRef.current.emit("next"); // Request the next chat
  };

  // Send a message in the chat
  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMessage) {
      socketRef.current.emit("sendMessage", inputMessage);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: inputMessage, fromSelf: true },
      ]);
      setInputMessage(""); // Clear the input field
    }
  };

  return (
    <Container>
      <h1>Random Video Chat</h1>
      <VideoContainer>
        {stream && <Video playsInline muted ref={userVideo} autoPlay />}
        {chatActive && <Video playsInline ref={partnerVideo} autoPlay />}
      </VideoContainer>
      {chatActive ? (
        <>
          <Button onClick={nextChat}>Next</Button>
          <TextChat>
            <div>
              {messages.map((msg, index) => (
                <div key={index} className={msg.fromSelf ? "self" : "partner"}>
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit">Send</button>
            </form>
          </TextChat>
        </>
      ) : (
        <Button onClick={() => socketRef.current.emit("next")}>
          Start Chat
        </Button>
      )}
    </Container>
  );
};

export default VideoChat;
