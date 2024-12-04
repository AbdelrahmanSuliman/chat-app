package com.example.chatapp.repositories;

import com.example.chatapp.models.ChatRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ChatRequestRepository extends MongoRepository<ChatRequest, String> {
    List<ChatRequest> findByReceiverUsernameAndStatus(String receiverUsername, ChatRequest.RequestStatus status);
    List<ChatRequest> findBySenderUsernameAndStatus(String senderUsername, ChatRequest.RequestStatus status);
}
