import { jest } from "@jest/globals";
import { MetadataEnhancer } from "../../../src/enhancers/core/metadata-enhancer.js";
import { EnhancedResponse } from "../../../src/core/enhanced-response.js";
import { EnhancerPriority } from "../../../src/enhancers/base-enhancer.js";

describe("MetadataEnhancer", () => {
  let enhancer;
  let mockContext;

  beforeEach(() => {
    enhancer = new MetadataEnhancer();
    mockContext = {
      sessionId: "test-session",
      gitContext: {
        branch: "feature/test",
        lastCommit: "abc123",
      },
    };
  });

  describe("initialization", () => {
    it("should have correct properties", () => {
      expect(enhancer.name).toBe("MetadataEnhancer");
      expect(enhancer.metadata.description).toBe("Adds contextual metadata to responses");
      expect(enhancer.priority).toBe(EnhancerPriority.HIGH); // 80
    });
  });

  describe("canEnhance", () => {
    it("should return true for valid responses", () => {
      const response = new EnhancedResponse({ success: true, data: {} });
      expect(enhancer.canEnhance(response)).toBe(true);
    });

    it("should return false when disabled", () => {
      enhancer.setEnabled(false);
      const response = new EnhancedResponse({ success: true });
      expect(enhancer.canEnhance(response)).toBe(false);
    });
  });

  describe("enhance", () => {
    it("should add metadata to response", async () => {
      const response = new EnhancedResponse({
        success: true,
        data: { test: "value" },
      });

      const enhanced = await enhancer.enhance(response, mockContext);

      expect(enhanced.metadata.enhancedAt).toBeDefined();
    });

    it("should add system info when enabled", async () => {
      const response = new EnhancedResponse({
        success: true,
        data: {},
      });

      const enhanced = await enhancer.enhance(response, mockContext);

      expect(enhanced.metadata.system).toBeDefined();
      expect(enhanced.metadata.system.platform).toBeDefined();
      expect(enhanced.metadata.system.nodeVersion).toBeDefined();
    });

    it("should add process info when enabled", async () => {
      const response = new EnhancedResponse({
        success: true,
        data: {},
      });

      const enhanced = await enhancer.enhance(response, mockContext);

      expect(enhanced.metadata.process).toBeDefined();
      expect(enhanced.metadata.process.pid).toBeDefined();
      expect(enhanced.metadata.process.uptime).toBeDefined();
    });

    it("should add session context when available", async () => {
      const contextWithSession = {
        ...mockContext,
        session: {
          id: "test-session-id",
        },
      };

      const response = new EnhancedResponse({
        success: true,
        data: {},
      });

      const enhanced = await enhancer.enhance(response, contextWithSession);

      expect(enhanced.metadata.sessionId).toBe("test-session-id");
    });

    it("should handle missing context gracefully", async () => {
      const response = new EnhancedResponse({ success: true, data: {} });

      const enhanced = await enhancer.enhance(response, null);

      expect(enhanced.metadata.enhancedAt).toBeDefined();
      expect(enhanced.metadata.sessionId).toBeUndefined();
    });

    it("should add operation duration if start time provided", async () => {
      const contextWithTime = {
        ...mockContext,
        operationStartTime: Date.now() - 1000,
      };

      const response = new EnhancedResponse({ success: true, data: {} });

      const enhanced = await enhancer.enhance(response, contextWithTime);

      expect(enhanced.metadata.operationDuration).toBeDefined();
      expect(enhanced.metadata.operationDuration).toBeGreaterThan(900);
      expect(enhanced.metadata.operationDuration).toBeLessThan(1500);
    });

    it("should add custom metadata when configured", async () => {
      const customEnhancer = new MetadataEnhancer({
        customMetadata: {
          environment: "test",
          version: "1.0.0",
        },
      });

      const response = new EnhancedResponse({ success: true });
      const enhanced = await customEnhancer.enhance(response, mockContext);

      expect(enhanced.metadata.environment).toBe("test");
      expect(enhanced.metadata.version).toBe("1.0.0");
    });

    it("should add operation metadata from context", async () => {
      const contextWithOperation = {
        ...mockContext,
        operation: "test-operation",
      };

      const response = new EnhancedResponse({ success: true });
      const enhanced = await enhancer.enhance(response, contextWithOperation);

      expect(enhanced.metadata.operation).toBe("test-operation");
    });

    it("should add user metadata from context", async () => {
      const contextWithUser = {
        ...mockContext,
        user: "test-user",
      };

      const response = new EnhancedResponse({ success: true });
      const enhanced = await enhancer.enhance(response, contextWithUser);

      expect(enhanced.metadata.user).toBe("test-user");
    });

    it("should add source information from context", async () => {
      const contextWithSource = {
        ...mockContext,
        source: {
          tool: "test-tool",
          version: "1.0.0",
          component: "test-component",
        },
      };

      const response = new EnhancedResponse({ success: true });
      const enhanced = await enhancer.enhance(response, contextWithSource);

      expect(enhanced.metadata.source).toBeDefined();
      expect(enhanced.metadata.source.tool).toBe("test-tool");
      expect(enhanced.metadata.source.version).toBe("1.0.0");
      expect(enhanced.metadata.source.component).toBe("test-component");
    });

    it("should handle errors gracefully", async () => {
      const response = new EnhancedResponse({ success: true });
      
      // Mock a method to throw an error
      const originalAddMetadata = response.addMetadata;
      response.addMetadata = jest.fn().mockImplementationOnce(() => {
        throw new Error("Metadata error");
      }).mockImplementation(originalAddMetadata);

      // Should not throw
      const enhanced = await enhancer.enhance(response, mockContext);
      expect(enhanced).toBeDefined();
    });

    it("should respect configuration options", async () => {
      const configuredEnhancer = new MetadataEnhancer({
        includeSystemInfo: false,
        includeProcessInfo: false,
        includeTimestamps: false,
      });

      const response = new EnhancedResponse({ success: true });
      const enhanced = await configuredEnhancer.enhance(response, mockContext);

      expect(enhanced.metadata.system).toBeUndefined();
      expect(enhanced.metadata.process).toBeUndefined();
      expect(enhanced.metadata.enhancedAt).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle very large metadata", async () => {
      const largeContext = {
        ...mockContext,
        largeData: new Array(1000).fill("data"),
      };

      const response = new EnhancedResponse({ success: true });
      const enhanced = await enhancer.enhance(response, largeContext);

      expect(enhanced.metadata).toBeDefined();
    });

    it("should preserve response type", async () => {
      const response = new EnhancedResponse({ success: true });
      const enhanced = await enhancer.enhance(response, mockContext);

      expect(enhanced).toBeInstanceOf(EnhancedResponse);
    });

    it("should handle function-based custom metadata", async () => {
      const customEnhancer = new MetadataEnhancer({
        customMetadata: {
          dynamicValue: (context) => `dynamic-${context.sessionId}`,
        },
      });

      const response = new EnhancedResponse({ success: true });
      const enhanced = await customEnhancer.enhance(response, mockContext);

      expect(enhanced.metadata.dynamicValue).toBe("dynamic-test-session");
    });
  });
});