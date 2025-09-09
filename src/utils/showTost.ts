import { ToastAndroid, Platform } from 'react-native';
import Toast from 'react-native-simple-toast';
import _ from 'lodash';

const showToastFunc = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.showWithGravityAndOffset(
      message,
      ToastAndroid.LONG,
      ToastAndroid.BOTTOM,
      0,
      50
    );
  } else{
    Toast.showWithGravity(message,Toast.SHORT,0);
  }
};

export const showToast = _.debounce(showToastFunc, 500);
