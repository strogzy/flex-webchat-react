import React, { Component } from 'react';
import Chat from 'twilio-chat';
import * as base64 from 'base-64';
import MessageForm from './MessageForm'
import MessageList from './MessageList'
import config from '../config'

class WebChat extends Component {
  token;
  channelSid;
  channel;
  client;


  constructor(props) {
    super(props);
    this.bot = {
      id: 0
    };

    this.state = {
      error: null,
      isLoading: true,
      messages: [],
    };

    this.user = {
      id: "",
      firstName: props.firstName
    };

    this.setupChatClient = this.setupChatClient.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.handleError = this.handleError.bind(this);

  }

  encodeFormData = (data) => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
      .join('&');
  }

  componentDidMount() {
    console.log(this.user);
    fetch(`https://iam.twilio.com/v1/Accounts/${config.accountSID}/Tokens`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ 'products': ['flex'] })
    })
      .then(res => res.json())
      .then(data => {
        let body = {
          "FlexFlowSid": config.flexFlowSid,
          "ChatFriendlyName": "Webchat",
          "CustomerFriendlyName": this.user.firstName,
          "Identity": data.identity
        }
        this.user.id = data.identity;
        this.token = data.token;
        let headers = new Headers();
        headers.append('Authorization', 'Basic ' + base64.encode("token:" + data.token));
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        return fetch('https://flex-api.twilio.com/v1/WebChannels', {
          headers: headers,
          method: 'POST',
          body: this.encodeFormData(body)
        })
      })
      .then(res => res.json())
      .then(data => {
        console.log(data);
        Chat.create(this.token)
          .then(client => {
            this.client = client;
            return client.getChannelBySid(data.sid)
          })
          .then(channel => {
            this.channel = channel;
            this.setState({ isLoading: false });
            channel.getMessages();
            channel.on('messageAdded', message => {
              console.log(message.index);
              this.handleNewMessage(message)

            });

            channel.sendMessage("ahoy");
          }
          )
      })
      .then(console.log)
      .catch(this.handleError);

  }

  setupChatClient(client) {
    this.client = client;
    console.log("CLIENT>>>> " + client);
    this.client
      .getChannelByUniqueName('general')
      .then(channel => channel)
      .catch(error => {
        if (error.body.code === 50300) {
          return this.client.createChannel({ uniqueName: 'general' });
        } else {
          this.handleError(error);
        }
      })
      .then(channel => {
        this.channel = channel;
        return this.channel.join().catch(() => { });
      })
      .then(() => {
        // Success!
      })
      .catch(this.handleError);
  }
  handleError(error) {
    console.error(error);
    // this.setState({
    //   error: 'Could not load chat.'
    // });
  }



  handleNewMessage = (text) => {
    this.setState({
      messages: [...this.state.messages, { me: true, author: "Me", body: text.body }],
    })
  }

  sendMessage = (text) => {
    this.channel.sendMessage(text);
  }


  componentWillUnmount() {
    this.client.shutdown();
  }

  render() {
    if (this.state.error) {
      return <p>{this.state.error}</p>;
    } else if (this.state.isLoading) {
      return <p>Loading chat...</p>;
    }

    if (this.user.id) {
      return (

        <div className="ChatWindow">
          <MessageList messages={this.state.messages} />
          <MessageForm onMessageSend={this.sendMessage} />
        </div>
        
      );
    } else {
      return null;
    }
  }
}
export default WebChat;