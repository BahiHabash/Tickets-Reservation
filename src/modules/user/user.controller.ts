import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { RequestWithUser } from '../../common/interfaces';
import { WideEventLoggerService } from '../../core/logger';
import { LogAction } from '../../common/enums/logs.enum';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: WideEventLoggerService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    this.logger.assign({
      action: LogAction.REGISTER,
      user: { email: registerDto.email },
      messages: [`Registration attempt for ${registerDto.email}`],
    });
    return this.userService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginUserDto) {
    this.logger.assign({
      action: LogAction.LOGIN,
      user: { email: loginDto.email },
      messages: [`Login attempt for ${loginDto.email}`],
    });
    return this.userService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: RequestWithUser) {
    this.logger.assign({
      action: LogAction.GET_PROFILE,
      user: {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role,
      },
      messages: [`Fetching profile for ${req.user.sub}`],
    });

    const user = await this.userService.getProfile(req.user.sub);

    if (!user) {
      this.logger.assign({
        messages: [`User not found`],
      });
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Get()
  async getAllUsers() {
    this.logger.assign({
      action: LogAction.GET_ALL_USERS,
      messages: [`Fetching all users`],
    });
    return await this.userService.findAll();
  }
}
