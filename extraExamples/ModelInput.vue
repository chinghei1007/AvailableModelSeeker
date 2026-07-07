<template>
  <div>
    <input
      v-model="value"
      @keypress.enter="handleEnter"
      placeholder="Enter model ID or query"
    />
    <div v-if="error" style="color:red">{{ error }}</div>
    <div>
      <div v-for="(r, i) in results" :key="i" style="padding-left:0">
        {{ r }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ModelInput",
  data() {
    return {
      value: "",
      results: [],
      error: ""
    };
  },
  methods: {
    handleEnter() {
      if (!this.value.trim()) {
        this.error = "Error: Input cannot be empty";
        return;
      }
      this.error = "";
      this.results.push(this.value.trim());
      this.value = "";
    }
  }
};
</script>

<!-- For Vue Router, add into routes.js
import { createRouter, createWebHistory } from "vue-router";
import ModelInput from "./ModelInput.vue";

const routes = [
  { path: "/", component: ModelInput },
  // add other routes here
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router; -->

