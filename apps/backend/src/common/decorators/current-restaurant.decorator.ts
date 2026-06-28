import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentRestaurant = createParamDecorator(
  (data: keyof any | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const restaurant = request.restaurant;
    return data ? restaurant?.[data] : restaurant;
  },
);
