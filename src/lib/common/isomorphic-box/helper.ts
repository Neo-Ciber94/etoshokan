import z, { ZodType, ZodVoid, ZodAny } from 'zod';

type HelperOptions<TInput extends ZodType, TOutput extends ZodType> = {
	input?: TInput;
	output?: TOutput;
};

type HelperOutput<TInput extends ZodType = ZodVoid, TOutput extends ZodType = ZodAny> = (
	input: z.input<TInput>
) => z.output<TOutput>;

type HelperFunction = {
	<TInput extends ZodType, TOutput extends ZodType, F extends HelperOutput<TInput, TOutput>>(
		options: HelperOptions<TInput, TOutput>,
		f: F
	): F;
};

export const h: HelperFunction = <
	TInput extends ZodType,
	TOutput extends ZodType,
	F extends HelperOutput<TInput, TOutput>
>(
	options: HelperOptions<TInput, TOutput>,
	f: F
) => {
	const inputSchema = options.input;
	const outputSchema = options.output;
	const returned = (rawInput: z.input<TInput>) => {
		const input = inputSchema?.parse(rawInput) as z.input<TInput>;

		if (outputSchema) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = f(input as any);
			return outputSchema.parse(result);
		} else {
			return f(input);
		}
	};

	return returned as F;
};
