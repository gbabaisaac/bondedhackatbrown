const appJson = require('./app.json')

const baseExpo = appJson.expo || {}
const isDevClient = process.env.EAS_BUILD_PROFILE === 'development'
  || process.env.EXPO_PUBLIC_USE_DEV_CLIENT === 'true'

const basePlugins = Array.isArray(baseExpo.plugins) ? baseExpo.plugins : []
const filteredPlugins = basePlugins.filter((plugin) => {
  const name = Array.isArray(plugin) ? plugin[0] : plugin
  return name !== 'expo-dev-client'
})

if (isDevClient) {
  filteredPlugins.push('expo-dev-client')
}

module.exports = {
  expo: {
    ...baseExpo,
    plugins: filteredPlugins,
  },
}
