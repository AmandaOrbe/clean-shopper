import type { FC } from 'react';

interface UserMessageProps {
  text: string;
}

const UserMessage: FC<UserMessageProps> = ({ text }) => (
  <div className="flex justify-end">
    <div className="bg-primary text-white px-space-md py-space-sm rounded-lg max-w-[80%] whitespace-pre-wrap">
      {text}
    </div>
  </div>
);

export default UserMessage;
