<script lang="ts" setup>
import { reactive, ref } from "vue";
import { useMessage, FormInst } from "naive-ui";

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

const handleLogin = (e: MouseEvent) => {
  e.preventDefault();
  formRef.value?.validate((errors) => {
    if (!errors) {
      message.success("Login logic would go here");
      console.log("Login with:", model.username, model.password);
    } else {
      console.error(errors);
      message.error("Please fill in the required fields");
    }
  });
};

const handleResetPassword = () => {
  message.info("Redirecting to reset password page...");
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
          <n-button text @click="handleResetPassword" class="reset-link">
            Reset Password
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

.reset-link {
  font-size: 14px;
  align-self: flex-end;
}
</style>

