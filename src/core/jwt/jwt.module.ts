import { Module, Global } from '@nestjs/common';
import { JwtModule as JwtOriginalModule, JwtModuleOptions } from '@nestjs/jwt';
import { TokenConfig } from '../config/configurations';

@Global()
@Module({
  imports: [
    JwtOriginalModule.registerAsync({
      inject: [TokenConfig],
      useFactory: (tokenConfig: TokenConfig): JwtModuleOptions => ({
        secret: tokenConfig.secret,
        signOptions: {
          expiresIn: tokenConfig.ttl,
        },
      }),
    }),
  ],
  exports: [JwtOriginalModule],
})
export class JwtModule {}
