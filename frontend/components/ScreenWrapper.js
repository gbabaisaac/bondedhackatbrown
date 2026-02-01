// well put all of our screen components in this file

import { View, Text } from 'react-native'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ScreenWrapper = ({children,bg}) => {
    const {top} = useSafeAreaInsets();
    // if the top is greater than 8(has notch), we add 5 to it, otherwise we add 30
    const paddingTop = top>8? top+5: 30;
  return (
    <View style = {{flex:1,paddingTop,backgroundColor:bg}}>
    {

    children
    
    }
    </View>
  );
}

export default ScreenWrapper