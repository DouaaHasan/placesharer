import React, {
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import useHttpClient from "../../shared/hooks/http-hook";
import { AuthContext } from "../../shared/context/auth-context";
import Card from "../../shared/component/UIElements/Card";
import ErrorModal from "../../shared/component/UIElements/ErrorModal";
import LoadingSpinner from "../../shared/component/UIElements/LoadingSpinner";
import "./Messages.css";
import { Link } from "react-router-dom";
import { MessageContext } from "../../shared/context/message-context";
import Input from "../../shared/component/formElements/Input";
import { useFrom } from "../../shared/hooks/form-hook";
import { VALIDATOR_REQUIRE } from "../../shared/Util/validators";
import Button from "../../shared/component/formElements/Button";
import MessageItem from "../components/MessageItem";
import { Avatar } from "@material-ui/core";

const Messages = () => {
  const [contacts, setContacts] = useState([]);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const { token } = useContext(AuthContext);
  const message = useContext(MessageContext);
  const [allMessages, setAllMessages] = useState(message.messagesData);
  const [mobileContactMode, setMobileContactMode] = useState(true);
  const [textedUser, setTextedUser] = useState(message.textedUser);

  // scroll to the bottom of the messages box
  const myScrollRef = useRef();
  const scrollToBottom = () => {
    myScrollRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const [state, inputHandler] = useFrom(
    {
      message: {
        value: "",
        isValid: false,
      },
    },
    false
  );

  // fetching contacts (only texted ones not all users)
  const fetchContacts = useCallback(async () => {
    try {
      const data = await sendRequest(
        `${process.env.REACT_APP_BACKEND_URL}/user/messages`,
        "GET",
        null,
        {
          Authorization: `Bearer ${token}`,
        }
      );
      setContacts(data.corresponders);
      scrollToBottom();
    } catch (error) {}
  }, [sendRequest, token]);

  useEffect(() => {
    fetchContacts();
  }, [sendRequest, token, message.textedUser, fetchContacts]);

  // Send a message
  const sendMessage = async (e) => {
    e.preventDefault();
    const corresponderId = message.id;
    const messageValue = state.inputs.message.value;
    try {
      const res = await sendRequest(
        `${process.env.REACT_APP_BACKEND_URL}/user/messages/${corresponderId}`,
        "POST",
        JSON.stringify({
          message: messageValue,
        }),
        {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        }
      );
      setAllMessages([
        ...allMessages,
        { message: messageValue, isSent: true, _id: res.messageId },
      ]);
      scrollToBottom();
      getUserMessages(corresponderId);
    } catch (error) {
      console.error(error);
    }
  };

  // Get all messages as per the texted person
  const getUserMessages = async (id) => {
    const corresponderId = id;

    try {
      // console.log(textedUser);
      const fetchedMessages = await sendRequest(
        `${process.env.REACT_APP_BACKEND_URL}/user/messages/${corresponderId}`,
        "GET",
        null,
        {
          Authorization: "Bearer " + token,
        }
      );
      fetchContacts();
      setAllMessages(fetchedMessages.messages);

      message.id = corresponderId;
    } catch (error) {
      console.error(error);
    }
  };

  // Delete a corresponder
  const dltCorresponder = async (id) => {
    try {
      await sendRequest(
        `${process.env.REACT_APP_BACKEND_URL}/user/messages/${id}`,
        "DELETE",
        null,
        {
          Authorization: "Bearer " + token,
        }
      );
      const filteredContacts = contacts.filter((contact) => contact._id !== id);
      setContacts(filteredContacts);
      if (id === message.id) {
        setTextedUser("");
        message.textedUser = "";
      }
      setAllMessages([]);
      fetchContacts();
    } catch (error) {
      console.log(error);
    }
  };

  const messageDeleteHandler = (deletedMsgId) => {
    setAllMessages((prevAllMessages) =>
      prevAllMessages.filter((msg) => msg.id !== deletedMsgId)
    );
  };

  return (
    <React.Fragment>
      {isLoading && <LoadingSpinner asOverlay />}
      <ErrorModal error={error} onClear={clearError} />

      {!isLoading && (
        <Card className="messages__card fade-in">
          {/* Contacts */}
          <div
            className={
              mobileContactMode
                ? `contacts__container contact__container-mobile fade-in`
                : `contacts__container contact__container-hidden fade-in`
            }
          >
            <h2 className="header fade-in">Recent</h2>
            <div className="contacts__box fade-in">
              {contacts.length > 0 &&
                contacts.map((contact) => (
                  <Card
                    key={contact.corresponder._id}
                    className={`user-item__content ${
                      message.id === contact.corresponder._id &&
                      "activatedContact"
                    }`}
                  >
                    <div
                      onClick={() => {
                        getUserMessages(contact.corresponder._id);
                        if (contact.corresponder) {
                          setTextedUser(contact.corresponder.name);
                          message.textedUser = contact.corresponder.name;
                        }
                        setMobileContactMode(false);
                      }}
                      className={`cardWidth fade-in`}
                    >
                      <div className="user-item__image m-1 fade-in">
                        <Avatar
                          src={contact.corresponder.image}
                          alt={contact.corresponder.name}
                        />
                      </div>
                      <div className="user-item__info m-1 fade-in">
                        <h3 className="fade-in corr-name">
                          {contact.corresponder.name}
                        </h3>
                      </div>
                    </div>

                    <button
                      className="corr-delete"
                      onClick={() => dltCorresponder(contact.corresponder._id)}
                    >
                      &#10060;
                    </button>
                  </Card>
                ))}
            </div>
            <div className="innerBox fade-in">
              {contacts.length === 0 && (
                <Link className="link-text fade-in" to="/">
                  Text a user!
                </Link>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            className={
              mobileContactMode
                ? `message__box message__box-hidden fade-in`
                : `message__box message__box-mobile fade-in`
            }
          >
            <h2 className="header fade-in">
              Messages{" "}
              {textedUser && textedUser !== undefined && `with ${textedUser}`}
            </h2>
            <a
              href="#!"
              onClick={() => {
                setMobileContactMode(true);
              }}
              className="mobile-hidden"
            >
              &#10094; BACK
            </a>
            <div className="msgsContainer fade-in">
              {allMessages.length > 0 ? (
                allMessages.map((msg, i) => (
                  <MessageItem
                    key={i}
                    msg={msg}
                    messageDeleteHandler={messageDeleteHandler}
                    getUserMessages={getUserMessages}
                    contacts={contacts}
                  />
                ))
              ) : (
                <div>Start a message!</div>
              )}
              <div ref={myScrollRef}></div>
            </div>

            <form onSubmit={sendMessage}>
              <Input
                id="message"
                element="input"
                type="text"
                validators={[VALIDATOR_REQUIRE()]}
                errorText="Please enter your message"
                onInput={inputHandler}
              />
              <Button type="submit">Send</Button>
            </form>
          </div>
        </Card>
      )}
    </React.Fragment>
  );
};
export default Messages;
