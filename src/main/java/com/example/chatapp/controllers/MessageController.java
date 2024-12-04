package com.example.chatapp.controllers;

import com.example.chatapp.models.Message;
import com.example.chatapp.services.MessageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/api/messages")
public class MessageController {
    MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping("/save")
    public ResponseEntity<String> saveMessage(@RequestBody Message message){
        messageService.saveMessage(message);
        return new ResponseEntity<>("Message saved successfully!", HttpStatus.CREATED);
    }

    @GetMapping("/history")
    public ResponseEntity<List<Message>> getMessageHistory(
            @RequestParam String sender,
            @RequestParam String receiver
    ) {
        List<Message> conversation = messageService.getMessagesBetweenUsers(sender, receiver);
        return ResponseEntity.ok(conversation);
    }

}
