import { Test, TestingModule } from '@nestjs/testing';
import { MenuImagesController } from './menu-images.controller';

describe('MenuImagesController', () => {
  let controller: MenuImagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuImagesController],
    }).compile();

    controller = module.get<MenuImagesController>(MenuImagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
