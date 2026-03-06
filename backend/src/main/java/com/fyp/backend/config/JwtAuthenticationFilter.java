package com.fyp.backend.config;

import com.fyp.backend.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.dao.DataAccessException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        
        String uri = request.getRequestURI();
        String method = request.getMethod();

        if (authHeader == null || authHeader.isBlank() || !authHeader.startsWith("Bearer ")) {
            if ((authHeader == null || authHeader.isBlank()) && uri != null && uri.startsWith("/api/")
                    && !uri.startsWith("/api/auth/")) {
                log.debug("JWT skip: no Authorization header, method={} uri={}", method, uri);
            } else if (authHeader != null && !authHeader.isBlank()) {
                log.debug("JWT skip: Authorization present but not Bearer, method={} uri={}", method, uri);
            }
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        if (jwt.isEmpty()) {
            log.warn("JWT skip: Bearer token is empty, method={} uri={}", request.getMethod(), request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String username = jwtUtil.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                if (jwtUtil.validateToken(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } else {
                    log.warn("JWT skip: token invalid or expired for user={}, method={} uri={}", username,
                            method, uri);
                }
            }
        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            // User not found (e.g. deleted) - treat as auth failure, let Spring return 401
            if (e instanceof UsernameNotFoundException || cause instanceof UsernameNotFoundException) {
                log.warn("JWT user not found: {}", e.getMessage());
            } else if (e instanceof DataAccessException || cause instanceof DataAccessException
                    || e.getClass().getSimpleName().contains("DataAccess")) {
                // Transient errors (DB, etc.) - return 503 so frontend does not clear token
                log.error("JWT auth failed due to data access error, returning 503", e);
                response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getOutputStream()
                        .write("{\"message\":\"Service temporarily unavailable\"}".getBytes(StandardCharsets.UTF_8));
                return;
            } else {
                // JWT invalid/expired or other auth-related - continue, Spring will return 401
                log.error("JWT authentication failed", e);
            }
        }

        filterChain.doFilter(request, response);
    }
}
