import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function delay(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function isMobile() {
	if (typeof window === 'undefined') {
		return false;
	}

	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
