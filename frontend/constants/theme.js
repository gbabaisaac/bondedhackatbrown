/**
 * DEPRECATED: This file is deprecated and will be removed in a future version.
 * 
 * Please migrate to using the theme system from app/theme/index.js:
 * 
 * OLD:
 *   import theme from '../constants/theme'
 * 
 * NEW:
 *   import { useAppTheme } from '../app/theme'
 *   const theme = useAppTheme()
 * 
 * This file now exports the light theme for backward compatibility during migration.
 * All new code should use useAppTheme() hook instead.
 */

import { lightTheme } from '../app/theme'

// Export light theme as default for backward compatibility
const theme = lightTheme

export default theme


