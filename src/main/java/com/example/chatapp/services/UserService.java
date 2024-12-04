package com.example.chatapp.services;

import com.example.chatapp.models.User;
import com.example.chatapp.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void registerUser(User user) {
        if (user.getUsername() == null || user.getUsername().isEmpty()) {
            throw new IllegalArgumentException("Username cannot be empty");
        }
        
        // Check if user already exists
        if (userRepository.findByUsername(user.getUsername()) != null) {
            throw new IllegalArgumentException("Username already exists");
        }
        
        String hashedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(hashedPassword);
        System.out.println("Registering user: " + user.getUsername() + " with hashed password: " + hashedPassword);
        userRepository.save(user);
    }

    public boolean loginUser(String username, String password) {
        System.out.println("Attempting login for user: " + username);
        User user = userRepository.findByUsername(username);
        
        if (user == null) {
            System.out.println("User not found: " + username);
            return false;
        }
        
        boolean passwordMatches = passwordEncoder.matches(password, user.getPassword());
        System.out.println("Password match result for " + username + ": " + passwordMatches);
        return passwordMatches;
    }

    public User authenticateUser(String username, String password) {
        User user = userRepository.findByUsername(username);
        if (user != null && passwordEncoder.matches(password, user.getPassword())) {
            return user;
        }
        return null;
    }

    public List<String> getAllUsernames() {
        List<User> users = userRepository.findAll();
        return users.stream()
                .map(User::getUsername)
                .filter(username -> username != null && !username.isEmpty())
                .collect(Collectors.toList());
    }
}
