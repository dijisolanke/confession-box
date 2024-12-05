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
  const [stream, setStream] = useState(null);
  const [chatActive, setChatActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [signalHandled, setSignalHandled] = useState(false);

  const userVideo = useRef(null);
  const partnerVideo = useRef(null);
  const connectionRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize the user's local video/audio stream
  const initializeStream = async () => {
    if (stream) return stream;
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(currentStream);
      if (userVideo.current) userVideo.current.srcObject = currentStream;
      return currentStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      return null;
    }
  };

  // Handle peer connection
  const createPeer = (initiator, currentStream, partnerSignal) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream: currentStream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:global.xirsys.net",
            username: "djisolanke",
            credential: "24f35fd8-b121-11ef-8eb2-0242ac150003",
          },
        ],
      },
    });

    peer.on("signal", (data) => {
      if (initiator) {
        console.log("Sending signal to partner:", data);
        socketRef.current.emit("callUser", {
          userToCall: socketRef.current.id,
          signalData: data,
        });
      } else {
        console.log("Answering call with signal:", data);
        socketRef.current.emit("answerCall", { signal: data });
      }
    });

    peer.on("stream", (partnerStream) => {
      console.log("Received partner's stream.");
      if (partnerVideo.current) partnerVideo.current.srcObject = partnerStream;
    });

    peer.on("error", (err) => console.error("Peer connection error:", err));
    peer.on("close", () => {
      console.log("Peer connection closed.");
      connectionRef.current = null;
      setChatActive(false);
    });

    if (partnerSignal) {
      try {
        console.log("Setting remote signal...");
        peer.signal(partnerSignal);
      } catch (err) {
        console.error("Error setting remote signal:", err);
      }
    }
    return peer;
  };

  const startCall = async (partnerId) => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    const currentStream = await initializeStream();
    if (!currentStream) return;

    connectionRef.current = createPeer(true, currentStream);
  };

  const answerCall = async (signal) => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    const currentStream = await initializeStream();
    if (!currentStream) return;

    connectionRef.current = createPeer(false, currentStream, signal);
  };

  const endCall = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    setChatActive(false);
    setMessages([]);
  };

  const handleNextChat = () => {
    endCall();
    setSignalHandled(false);
    socketRef.current.emit("next");
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const message = { text: inputMessage, fromSelf: true };
    setMessages((prevMessages) => [...prevMessages, message]);
    socketRef.current.emit("sendMessage", inputMessage);
    setInputMessage("");
  };

  useEffect(() => {
    socketRef.current = io("https://confession-box-server.onrender.com");

    socketRef.current.on("connect", () => {
      setConnected(true);
      console.log("Connected to server.");
    });

    socketRef.current.on("disconnect", () => {
      setConnected(false);
      console.log("Disconnected from server.");
    });

    socketRef.current.on("matched", async ({ partnerId }) => {
      console.log("Matched with partner:", partnerId);
      setChatActive(true);
      await initializeStream();
      startCall(partnerId);
    });

    socketRef.current.on("callUser", async ({ signal }) => {
      if (!signalHandled) {
        setSignalHandled(true); // Prevent multiple calls
        console.log("Incoming call signal received.");
        await initializeStream();
        answerCall(signal);
      }
    });

    socketRef.current.on("callAccepted", (signal) => {
      if (!signalHandled) {
        setSignalHandled(true); // Prevent multiple calls
        console.log("Call accepted by partner.");
        if (connectionRef.current) connectionRef.current.signal(signal);
      }
    });

    socketRef.current.on("receiveMessage", (message) => {
      console.log("Message received:", message);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, fromSelf: false },
      ]);
    });

    socketRef.current.on("chatEnded", ({ message }) => {
      console.log(message);
      endCall();
    });

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (socketRef.current) socketRef.current.disconnect();
      if (connectionRef.current) connectionRef.current.destroy();
    };
  }, [stream]);

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
          <Button onClick={handleNextChat}>Next</Button>
          <TextChat>
            <div>
              {messages.map((msg, index) => (
                <div key={index} className={msg.fromSelf ? "self" : "partner"}>
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage}>
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
        <Button onClick={handleNextChat}>Start Chat</Button>
      )}
    </Container>
  );
};

export default VideoChat;
