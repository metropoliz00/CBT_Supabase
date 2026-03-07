module.exports = {
  apps: [{
    name: "cbt-backend",
    script: "index.js",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      DB_HOST: "localhost",
      DB_USER: "your_db_user",
      DB_PASSWORD: "your_db_password",
      DB_NAME: "cbt_db"
    }
  }]
};
