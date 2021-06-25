
<template>
  <el-container id="app" class="main-container">
    <el-aside width="120px" class="main-aside">
      <img class="logo" src="@/assets/logo.png"/>
      <ul class="menu">
        <router-link to="/run" class="menu-item" tag="li" :class="{active: $route.path == '/run'}">
          <i class="el-icon-s-promotion"/>
          <span>巡查</span>
        </router-link>
        <router-link to="/setting" class="menu-item" tag="li" :class="{active: $route.path == '/setting'}">
          <i class="el-icon-s-tools"/>
          <span>设置</span>
        </router-link>
      </ul>
    </el-aside>
    <el-main class="main-body">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['Run']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </el-main>
  </el-container>
</template>

<style lang="less" scoped>
.main-container {
  height: 100%;
}
.main-aside {
  background: linear-gradient(to bottom right, #485BFF, #2994FE);
}
.main-body {
  padding: 12px;
}
.logo {
  display: block;
  width: 60px;
  height: 60px;
  margin: 20px auto 30px;
}
.menu {
  .menu-item {
    height: 48px;
    line-height: 48px;
    color: #E6E6E6;
    display: flex;
    align-items: center;
    font-size: 16px;
    padding: 0 20px;
    cursor: pointer;
    i {
      font-size: 18px;
      margin-right: 12px;
    }
    &:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #FFFFFF;
    }
    &.active {
      background: rgba(0, 0, 0, 0.2);
      color: #FFFFFF;
    }
  }
}
</style>