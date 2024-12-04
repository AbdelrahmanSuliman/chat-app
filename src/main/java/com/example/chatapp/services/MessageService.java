package com.example.chatapp.services;

import com.example.chatapp.models.Message;
import com.example.chatapp.repositories.MessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MessageService {
    MessageRepository messageRepository;

    public MessageService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    public Message saveMessage(Message message){
        message.setTimestamp(LocalDateTime.now());
        return messageRepository.save(message);
    }

    public List<Message> getMessagesBetweenUsers(String sender, String receiver) {
        return messageRepository.findBySenderUsernameAndReceiverUsername(sender, receiver);
    }


}
