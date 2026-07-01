import clsx from 'clsx';
import { MouseEventHandler, ReactNode } from 'react';

export default function Button(props: {
  className?: string;
  href?: string;
  imgUrl: string;
  onClick?: MouseEventHandler;
  title?: string;
  children: ReactNode;
}) {
  return (
    <a
      className={clsx('hud-btn pointer-events-auto', props.className)}
      href={props.href}
      title={props.title}
      onClick={props.onClick}
    >
      <img src={props.imgUrl} alt="" />
      <span>{props.children}</span>
    </a>
  );
}
