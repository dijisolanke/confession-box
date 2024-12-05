import React, { useState, useRef, useEffect } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const VideoChat = () => {
  const [stream, setStream] = useState(null);
  const [connected, setConnected] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socketRef = useRef();
  const connectionRef = useRef();

  // Function to initialize local stream
  const initializeStream = async () => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(localStream);
      if (userVideo.current) {
        userVideo.current.srcObject = localStream;
      }
      return localStream;
    } catch (error) {
      console.error("Error accessing user media:", error);
      return null;
    }
  };

  // Function to clean up existing Peer connection
  const cleanupPeer = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy(); // Destroy peer connection
      connectionRef.current = null; // Clear the reference
      console.log("Peer connection cleaned up.");
    }
  };

  // Function to handle outgoing calls
  const callUser = async (partnerId) => {
    const currentStream = stream || (await initializeStream());
    if (!currentStream) {
      console.error("Stream not initialized. Cannot call user.");
      return;
    }

    // Clean up existing peer connection
    cleanupPeer();

    const peer = new Peer({
      initiator: true,
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
      console.log("Sending signal to partner:", data);
      socketRef.current.emit("callUser", {
        userToCall: partnerId,
        signalData: data,
      });
    });

    peer.on("stream", (partnerStream) => {
      console.log("Received partner's stream:", partnerStream);
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = partnerStream;
      }
    });

    peer.on("error", (err) => {
      console.error("Peer connection error:", err);
    });

    peer.on("close", () => {
      console.log("Peer connection closed.");
      connectionRef.current = null;
    });

    connectionRef.current = peer;
  };

  // Function to handle incoming calls
  const answerCall = async (incomingSignal) => {
    const currentStream = stream || (await initializeStream());
    if (!currentStream) {
      console.error("Stream not initialized. Cannot answer call.");
      return;
    }

    // Clean up existing peer connection
    cleanupPeer();

    const peer = new Peer({
      initiator: false,
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
      console.log("Answering call with signal:", data);
      socketRef.current.emit("answerCall", { signal: data });
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
      console.log("Peer connection closed.");
      connectionRef.current = null;
    });

    peer.signal(incomingSignal);

    connectionRef.current = peer;
  };

  // Lifecycle and socket setup
  useEffect(() => {
    // Connect to the socket server
    socketRef.current = io.connect(
      "https://confession-box-server.onrender.com"
    );

    socketRef.current.on("connect", () => {
      setConnected(true);
      console.log("Connected to server.");
    });

    socketRef.current.on("disconnect", () => {
      setConnected(false);
      console.log("Disconnected from server.");
      cleanupPeer(); // Clean up peer when socket disconnects
    });

    // Listen for call signals
    socketRef.current.on("callIncoming", ({ signal, from }) => {
      console.log("Incoming call signal received from:", from);
      answerCall(signal); // Answer the call with the signal
    });

    socketRef.current.on("callAccepted", (signal) => {
      console.log("Call accepted by partner.");
      if (connectionRef.current) {
        connectionRef.current.signal(signal); // Set the partner's signal
      }
    });

    return () => {
      // Cleanup on component unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      cleanupPeer(); // Clean up peer connection
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div>
      <h1>Video Chat</h1>
      <div>
        <video
          ref={userVideo}
          autoPlay
          playsInline
          muted
          style={{ width: "300px", border: "1px solid black" }}
        />
        <video
          ref={partnerVideo}
          autoPlay
          playsInline
          style={{ width: "300px", border: "1px solid black" }}
        />
      </div>
      <button
        onClick={() => {
          const partnerToCall = prompt("Enter the partner ID:");
          if (partnerToCall) callUser(partnerToCall);
        }}
        disabled={!connected}
      >
        Call Partner
      </button>
    </div>
  );
};

export default VideoChat;
