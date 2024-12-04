package com.example.chatapp.services;

import com.example.chatapp.models.ChatRequest;
import com.example.chatapp.repositories.ChatRequestRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ChatRequestService {
    private final ChatRequestRepository chatRequestRepository;

    public ChatRequestService(ChatRequestRepository chatRequestRepository) {
        this.chatRequestRepository = chatRequestRepository;
    }

    public ChatRequest createRequest(ChatRequest request) {
        return chatRequestRepository.save(request);
    }

    public List<ChatRequest> getPendingRequestsForUser(String username) {
        return chatRequestRepository.findByReceiverUsernameAndStatus(username, ChatRequest.RequestStatus.PENDING);
    }

    public List<ChatRequest> getSentRequestsForUser(String username) {
        return chatRequestRepository.findBySenderUsernameAndStatus(username, ChatRequest.RequestStatus.PENDING);
    }

    public ChatRequest updateRequestStatus(String requestId, ChatRequest.RequestStatus status) {
        ChatRequest request = chatRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));
        request.setStatus(status);
        return chatRequestRepository.save(request);
    }
}
