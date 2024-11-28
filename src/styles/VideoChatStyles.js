import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;

export const Video = styled.video`
  width: 40%;
  max-width: 400px;
  margin: 0 10px;
  filter: blur(4px);
`;

export const Button = styled.button`
  margin: 10px;
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
`;

export const TextChat = styled.div`
  width: 300px;
  height: 400px;
  border: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  margin-top: 20px;

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
    }

    button {
      padding: 5px 10px;
      background-color: #4caf50;
      color: white;
      border: none;
      cursor: pointer;
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