import React, { useEffect, useRef, useState } from "react";
import {
  Container,
  VideoContainer,
  Video,
  Button,
  TextChat,
  StatusMessage,
} from "../styles/VideoChatStyles";
import io from "socket.io-client";
import Peer from "simple-peer";

const VideoChat = () => {
  const [stream, setStream] = useState();
  const [chatActive, setChatActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const userVideo = useRef();
  const partnerVideo = useRef();
  const connectionRef = useRef();
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io.connect(
      "https://confession-box-server.onrender.com"
    );

    socketRef.current.on("connect", () => {
      setConnected(true);
      console.log("Connected to server");
    });

    socketRef.current.on("disconnect", () => {
      setConnected(false);
      console.log("Disconnected from server");
    });

    socketRef.current.on("reconnect", (attemptNumber) => {
      console.log(`Reconnected to server after ${attemptNumber} attempts`);
      setConnected(true);
    });

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
        // Handle the error (e.g., display an error message to the user)
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
      if (connectionRef.current) {
        connectionRef.current.destroy();
      }
    };
  }, []);

  const callUser = (partnerId) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          // { urls: "stun:global.stun.twilio.com:3478" },
          // Add your TURN server configuration here
        ],
      },
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

    peer.on("error", (err) => {
      console.error("Peer connection error:", err);
      // Handle the error (e.g., display an error message, try to reconnect)
    });

    peer.on("close", () => {
      console.log("Peer connection closed");
      // Handle the closure (e.g., reset the UI, prepare for a new connection)
    });

    connectionRef.current = peer;
  };

  const answerCall = (incomingSignal) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
          // Add your TURN server configuration here
        ],
      },
    });

    peer.on("signal", (data) => {
      socketRef.current.emit("answerCall", { signal: data });
    });

    peer.on("stream", (partnerStream) => {
      partnerVideo.current.srcObject = partnerStream;
    });

    peer.on("error", (err) => {
      console.error("Peer connection error:", err);
      // Handle the error (e.g., display an error message, try to reconnect)
    });

    peer.on("close", () => {
      console.log("Peer connection closed");
      // Handle the closure (e.g., reset the UI, prepare for a new connection)
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
      <StatusMessage connected={connected}>
        {connected ? "Connected to server" : "Disconnected from server"}
      </StatusMessage>
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
