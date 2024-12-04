package com.example.chatapp.controllers;

import com.example.chatapp.models.Message;
import com.example.chatapp.services.MessageService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class WebSocketMessageController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;

    public WebSocketMessageController(SimpMessagingTemplate messagingTemplate, MessageService messageService) {
        this.messagingTemplate = messagingTemplate;
        this.messageService = messageService;
    }

    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload Message message, SimpMessageHeaderAccessor headerAccessor) {
        message.setTimestamp(java.time.LocalDateTime.now());
        
        // Get the authenticated username from the session
        String sessionUsername = (String) headerAccessor.getSessionAttributes().get("username");
        System.out.println("Session username: " + sessionUsername);
        System.out.println("Message sender: " + message.getSenderUsername());
        System.out.println("Message receiver: " + message.getReceiverUsername());
        
        if (sessionUsername == null) {
            System.out.println("No username found in session");
            return;
        }
        
        // Validate the sender
        if (!sessionUsername.equals(message.getSenderUsername())) {
            System.out.println("Session username doesn't match sender username");
            return;
        }
        
        // Save the message
        messageService.saveMessage(message);
        
        // Send to receiver - use the raw username without sanitization
        messagingTemplate.convertAndSendToUser(
            message.getReceiverUsername(),
            "/queue/messages",
            message
        );
        
        // Send back to sender for confirmation
        if (!message.getSenderUsername().equals(message.getReceiverUsername())) {
            messagingTemplate.convertAndSendToUser(
                message.getSenderUsername(),
                "/queue/messages",
                message
            );
        }
        
        System.out.println("Message sent successfully to: " + message.getReceiverUsername());
    }

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public Message addUser(@Payload Message message, SimpMessageHeaderAccessor headerAccessor) {
        String username = message.getSenderUsername();
        System.out.println("Adding user to chat: " + username);
        
        // Add username in web socket session
        headerAccessor.getSessionAttributes().put("username", username);
        message.setType(Message.MessageType.JOIN);
        
        // Send a welcome message back to the user
        Message welcomeMessage = new Message();
        welcomeMessage.setSenderUsername("System");
        welcomeMessage.setReceiverUsername(username);
        welcomeMessage.setContent("Welcome to the chat!");
        welcomeMessage.setType(Message.MessageType.CHAT);
        
        messagingTemplate.convertAndSendToUser(
            username,
            "/queue/messages",
            welcomeMessage
        );
        
        return message;
    }
}
