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
  const [connected, setConnected] = useState(false); // New state for connection status

  const userVideo = useRef();
  const partnerVideo = useRef();
  const connectionRef = useRef();
  const socketRef = useRef();

  useEffect(() => {
    // Connect to the WebSocket server
    socketRef.current = io.connect(
      "https://confession-box-server.onrender.com"
    );

    // Event listener for connection success
    socketRef.current.on("connect", () => {
      setConnected(true); // Update connection status to true.
    });

    // Event listener for disconnection
    socketRef.current.on("disconnect", () => {
      setConnected(false); // Update connection status to false
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      });

    socketRef.current.on("matched", ({ partnerId }) => {
      setChatActive(true);
      callUser(partnerId);
    });

    socketRef.current.on("callUser", ({ signal }) => {
      answerCall(signal);
    });

    socketRef.current.on("callAccepted", (signal) => {
      connectionRef.current.signal(signal);
    });

    socketRef.current.on("receiveMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const callUser = (partnerId) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socketRef.current.emit("callUser", {
        userToCall: partnerId,
        signalData: data,
      });
    });

    peer.on("stream", (partnerStream) => {
      partnerVideo.current.srcObject = partnerStream;
    });

    connectionRef.current = peer;
  };

  const answerCall = (incomingSignal) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socketRef.current.emit("answerCall", { signal: data });
    });

    peer.on("stream", (partnerStream) => {
      partnerVideo.current.srcObject = partnerStream;
    });

    peer.signal(incomingSignal);
    connectionRef.current = peer;
  };

  const nextChat = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    setChatActive(false);
    setMessages([]);
    socketRef.current.emit("next");
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMessage) {
      socketRef.current.emit("sendMessage", inputMessage);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: inputMessage, fromSelf: true },
      ]);
      setInputMessage("");
    }
  };

  return (
    <Container>
      <h1>Random Video Chat</h1>

      {/* Display connection status */}
      <div>
        {connected ? (
          <span style={{ color: "green" }}>Connected to server</span>
        ) : (
          <span style={{ color: "red" }}>Disconnected from server</span>
        )}
      </div>

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
