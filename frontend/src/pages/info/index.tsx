import React from 'react';
import { Typography } from '@mui/material';

const Info: React.FC = () => {
  return (
    <div>
      <Typography variant="h4">インフォメーションページ</Typography>
      <Typography>ここはログインしているユーザーだけが見れるページです。</Typography>
    </div>
  );
};

export default Info;