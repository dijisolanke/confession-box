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

  // Function to initialize the local media stream
  const initializeStream = async () => {
    if (!stream) {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(currentStream);

        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }

        console.log("Local media stream initialized.");
        return currentStream;
      } catch (error) {
        console.error("Error accessing media devices:", error);
        return null;
      }
    }
    return stream;
  };

  useEffect(() => {
    // Connect to the server
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

    // Set up listener for matched event
    socketRef.current.on("matched", async ({ partnerId }) => {
      setChatActive(true);
      const currentStream = await initializeStream();
      if (currentStream) {
        callUser(partnerId, currentStream);
      }
    });

    // Set up listener for incoming call
    socketRef.current.on("callUser", async ({ signal }) => {
      const currentStream = await initializeStream();
      if (currentStream) {
        answerCall(signal, currentStream);
      }
    });

    // Listener for call acceptance
    socketRef.current.on("callAccepted", (signal) => {
      connectionRef.current.signal(signal);
    });

    // Listener for incoming messages
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
  }, [stream]);

  const callUser = (partnerId) => {
    if (!stream) {
      console.error(
        "Stream is not initialized before creating Peer connection."
      );
      return;
    }
    console.log("Local stream in callUser:", stream);

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
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
      console.log("Sending signal:", data);
      socketRef.current.emit("callUser", {
        userToCall: partnerId,
        signalData: data,
      });
    });

    peer.on("stream", (partnerStream) => {
      console.log("Received partner stream:", partnerStream);
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = partnerStream;
      }
    });

    peer.on("error", (err) => {
      console.error("Peer connection error:", err);
    });

    peer.on("close", () => {
      console.log("Peer connection closed");
    });

    connectionRef.current = peer;
  };

  const answerCall = (incomingSignal) => {
    if (!stream) {
      console.error(
        "Stream is not initialized before creating Peer connection."
      );
      return;
    }
    console.log("Local stream in answerCall:", stream);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
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
      console.log("Answering call with signal:", data);
      socketRef.current.emit("answerCall", { signal: data });
    });

    peer.on("stream", (partnerStream) => {
      console.log("Received partner stream in answerCall:", partnerStream);
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = partnerStream;
      }
    });

    peer.on("error", (err) => {
      console.error("Peer connection error:", err);
    });

    peer.on("close", () => {
      console.log("Peer connection closed");
    });

    try {
      console.log("Signaling incoming signal in answerCall:", incomingSignal);
      peer.signal(incomingSignal);
    } catch (error) {
      console.error("Error signaling in answerCall:", error);
    }
    connectionRef.current = peer;
  };

  // Fix to prevent signalingState-related errors
  const safeSignal = (peer, signalData) => {
    if (
      !peer._pc ||
      (peer._pc.signalingState === "stable" && signalData.type === "offer")
    ) {
      console.warn(
        "Skipping offer signaling as peer is already stable or peer connection is unavailable."
      );
      return;
    }

    try {
      peer.signal(signalData);
    } catch (error) {
      console.error("Error during signaling:", error);
    }
  };

  // Updated callUser event listener
  socketRef.current.on("callUser", async ({ signal }) => {
    const currentStream = await initializeStream();
    if (currentStream) {
      if (connectionRef.current) {
        connectionRef.current.destroy(); // Cleanup old connection
      }
      if (connectionRef.current) {
        safeSignal(connectionRef.current, signal);
      } else {
        answerCall(signal);
      }
    }
  });

  // Listener for call acceptance
  socketRef.current.on("callAccepted", (signal) => {
    if (connectionRef.current) {
      console.log("Signaling accepted signal.");
      safeSignal(connectionRef.current, signal); // Uses safeSignal here
    } else {
      console.error("No active peer connection to signal to.");
    }
  });

  // Updated matched event listener
  socketRef.current.on("matched", async ({ partnerId }) => {
    setChatActive(true);

    const currentStream = await initializeStream();
    if (currentStream) {
      if (connectionRef.current) {
        connectionRef.current.destroy(); // Cleanup old connection
      }
      callUser(partnerId);
    }
  });

  const nextChat = async () => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    setChatActive(false);
    setMessages([]);
    await initializeStream(); // Ensure stream is ready for the next chat
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
        <Button onClick={nextChat}>Start Chat</Button>
      )}
    </Container>
  );
};

export default VideoChat;
