import styled from "styled-components";

// Container for the entire page
export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  height: 100vh;
  justify-content: center;
`;

// Container for video viewports
export const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  margin-bottom: 20px; // Space between video and chat
`;

// Styled video element
export const Video = styled.video`
  width: 400px; // Fixed width of 400px
  height: 300px; // Set height for consistency
  margin: 0 20px; // 20px margin between the videos
  border-radius: 8px; // Rounded corners for a cleaner look
  object-fit: cover; // Ensures video content doesn't get distorted
  border: 2px solid #ccc; // Optional border to separate videos visually
`;

// Styled button for "Next" or "Start Chat"
export const Button = styled.button`
  margin: 10px;
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;

// Chat box area
export const TextChat = styled.div`
  width: 300px;
  height: 400px;
  border: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  border-radius: 8px;

  > div {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  form {
    display: flex;
    padding: 10px;

    input {
      flex: 1;
      padding: 5px;
      border: 1px solid #ccc;
      border-radius: 5px;
    }

    button {
      padding: 5px 10px;
      background-color: #4caf50;
      color: white;
      border: none;
      cursor: pointer;
      border-radius: 5px;
    }
  }

  .self {
    text-align: right;
    color: blue;
  }

  .partner {
    text-align: left;
    color: green;
  }
`;
