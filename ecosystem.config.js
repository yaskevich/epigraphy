module.exports = {
  apps : [
      {
        name: "epigraphy",
        script: "./index.js",
        watch: false,
        instance_var: 'INSTANCE_ID',
        env: {
            "PORT": 7528,
            "NODE_ENV": "production"
        }
      }
  ]
}