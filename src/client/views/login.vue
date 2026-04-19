<script lang="ts" setup>
import { reactive, ref } from "vue";
import { useMessage, FormInst } from "naive-ui";
import { useRouter } from "vue-router";
import { navigateAfterLogin } from "../lib/login-navigation";
import { useStore } from "../store";

const store = useStore();
const router = useRouter();
const formRef = ref<FormInst | null>(null);
const message = useMessage();

const model = reactive({
  username: "",
  password: ""
});

const rules = {
  username: {
    required: true,
    message: "Please input your username",
    trigger: "blur"
  },
  password: {
    required: true,
    message: "Please input your password",
    trigger: "blur"
  }
};

const handleLogin = async (e: MouseEvent) => {
  e.preventDefault();
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      try {
        message.loading("Logging in...");
        const result = await store.login(model.username, model.password);
        message.destroyAll();
        message.success("Login successful!");
        console.log("Login with:", model.username, model.password);
        await navigateAfterLogin(router);
      } catch (error: any) {
        message.destroyAll();
        const errorMsg = error.response?.data?.error || "Login failed";
        message.error(errorMsg);
        console.error("Login error:", error);
      }
    } else {
      console.error(errors);
      message.error("Please fill in the required fields");
    }
  });
};

const handleCreateUser = async () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      // Validate password length
      // if (model.password.length < 6) {
      //   message.error("Password must be at least 6 characters long");
      //   return;
      // }
      
      try {
        const result = await store.addUser(model.username, model.password);
        message.success("User created successfully!");
        console.log("User created:", result);
        // Clear the form
        model.username = "";
        model.password = "";
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || "Failed to create user";
        message.error(errorMsg);
        console.error("Error creating user:", error);
      }
    } else {
      console.error(errors);
      message.error("Please fill in the required fields");
    }
  });
};
</script>

<template>
  <div class="login-container">
    <n-card title="Login" class="login-card">
      <n-form
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        label-width="auto"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="Username" path="username">
          <n-input v-model:value="model.username" placeholder="Enter username" />
        </n-form-item>
        <n-form-item label="Password" path="password">
          <n-input
            v-model:value="model.password"
            type="password"
            show-password-on="mousedown"
            placeholder="Enter password"
          />
        </n-form-item>
        <div class="login-actions">
          <n-button type="primary" @click="handleLogin" block>
            Login
          </n-button>
          <n-button @click="handleCreateUser" block secondary>
            Create New User
          </n-button>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.login-card {
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}
</style>

