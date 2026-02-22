module.exports = {
  apps: [
    {
      name: "cropperps-keeper",
      script: "npx",
      args: "hardhat run scripts/keeper.js --network fuji",
      cwd: __dirname,
      env: {
        PRIVATE_KEY: process.env.PRIVATE_KEY,
      },
      restart_delay: 10000,
      max_restarts: 50,
      autorestart: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
