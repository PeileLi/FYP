package com.fyp.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class HelloController {

    @GetMapping("/hello")
    public ResponseEntity<Map<String, String>> hello() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Hello from BlockFund Backend API!");
        response.put("status", "ok");
        return ResponseEntity.ok(response);
    }
}
