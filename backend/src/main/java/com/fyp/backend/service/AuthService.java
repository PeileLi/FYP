package com.fyp.backend.service;

import com.fyp.backend.dto.AuthResponse;
import com.fyp.backend.dto.LoginRequest;
import com.fyp.backend.dto.RegisterRequest;
import com.fyp.backend.model.User;
import com.fyp.backend.repository.UserRepository;
import com.fyp.backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class AuthService {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtUtil jwtUtil;
        private final AuthenticationManager authenticationManager;

        private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        private static final SecureRandom RANDOM = new SecureRandom();

        private String generateUniqueDisplayName() {
                String displayName;
                do {
                        StringBuilder sb = new StringBuilder("user_");
                        for (int i = 0; i < 8; i++) {
                                sb.append(CHARACTERS.charAt(RANDOM.nextInt(CHARACTERS.length())));
                        }
                        displayName = sb.toString();
                } while (userRepository.existsByDisplayName(displayName));
                return displayName;
        }

        @Transactional
        public AuthResponse register(RegisterRequest request) {
                if (userRepository.existsByUsername(request.getUsername())) {
                        throw new RuntimeException("Email already exists");
                }

                String displayName = generateUniqueDisplayName();

                User user = User.builder()
                                .username(request.getUsername())
                                .displayName(displayName)
                                .password(passwordEncoder.encode(request.getPassword()))
                                .role(User.Role.USER)
                                .enabled(true)
                                .build();

                user = userRepository.save(user);

                String token = jwtUtil.generateToken(user);

                return AuthResponse.builder()
                                .token(token)
                                .id(user.getId())
                                .username(user.getUsername())
                                .displayName(user.getDisplayName())
                                .avatarUrl(user.getAvatarUrl())
                                .role(user.getRole().name())
                                .build();
        }

        public AuthResponse login(LoginRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.getUsername(),
                                                request.getPassword()));

                User user = userRepository.findByUsername(request.getUsername())
                                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

                String token = jwtUtil.generateToken(user);

                return AuthResponse.builder()
                                .token(token)
                                .id(user.getId())
                                .username(user.getUsername())
                                .displayName(user.getDisplayName())
                                .avatarUrl(user.getAvatarUrl())
                                .role(user.getRole().name())
                                .build();
        }
}
