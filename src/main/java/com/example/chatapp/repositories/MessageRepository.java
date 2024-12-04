package com.example.chatapp.repositories;

import com.example.chatapp.models.Message;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findBySenderUsernameAndReceiverUsername(String sender, String receiver);
}
