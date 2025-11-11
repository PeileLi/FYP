package com.fyp.backend.controller;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class SampleController {
    @GetMapping("/hello")
    public String hello() {
        return "Backend is running successfully!";
    }
}