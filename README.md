# Sistema 2FA com aplicação de telemóvel
> Pretendemos através deste projeto implementar um serviço web simples tolerante a faltas e com suporte a autenticação de dois fatores com chaves de uso únicas temporais.
> [Demonstração](https://www.twofa.westeurope.cloudapp.azure.com) <!-- If you have the project hosted somewhere, include the link here. -->

## Menu
* [Descrição da Solução](#descrição-da-solução)
* [Tecnologias Usadas](#tecnologias-usadas)
* [Setup](#setup)
<!-- * [License](#license) -->


## Descrição da Solução
  Para oferecermos um serviço simples tolerante a faltas e seguro, criaremos um servidor para nossa aplicação com suporte a 2FA, que se comunicará com uma aplicação de autenticação simples para telemóvel, e que será replicado, assim como uma base de dados para armazenar dados de contas, com senhas cifradas. Haverão ainda reverse proxies entre os clientes e servidores, que servirão para balancear carga. Os servidores, bases de dados, e proxies serão replicados em máquinas virtuais. 
  
  Para a seguinte explicação assume-se que o cliente já possui uma conta criada no serviço. No momento que um cliente tentar se conectar a um servidor, um reverse proxy redirecionará o cliente para um servidor com menor carga. Depois que uma conexão for estabelecida, o cliente pedirá a página de login do serviço, e o servidor responderá. O cliente providenciará sua senha e e-mail, e se as credenciais estiverem corretas, prosseguirá para a verificação do TOTP. O servidor enviará a TOTP periódicamente para a aplicação de autenticação no dispositivo, e verificará a TOTP providenciada. Com a autenticação feita, o cliente poderá acessar ao serviço (que será uma tela em branco, com um texto parabenizando o cliente por ter se autenticado corretamente).

<img src="https://github.com/luisfelipeSB/fault_tolerant_2fa_service/blob/main/Documents/arquitetura2.png" width="500">

Pretendemos replicar uma vez cada componente do sistema, de forma a provar o conceito mas manter o design e implementação do sistema simples. Isto é, pretendemos implementar o caso específico da arquitetura geral, ilustrado na Fig. 1, para dois reverse proxies, dois servidores, e duas bases de dados, todos virtualizados. As bases de dados existirão em uma VM cada, e os pares de reverse proxies e servidores também. A partilha de VMs dos servidores e proxies é feita para economizar recursos. Um servidor DNS resolverá os IPs dos reverse proxies, um de cada vez, pelo cliente. Os proxies farão o balanceamento de carga. 

Será necessário garantir que a comunicação entre as componentes que passarem por redes seja cifrada, com TLS, com um certificado auto-assinado. As bases de dados estarão encriptadas. Será também necessário garantir que acessos concorrenciais às bases de dados não levem a problemas, e que os estados das bases de dados estejam sincronizados. 



## Tecnologias Usadas
- Azure
- Nginx
- Node.js + Express.js
- PostgreSQL + Bucardo
- Bcrypt
- Flutter
- Passport.js + express-session
- CryptoJS + Steel Crypt
- Otplib
- Cron
- Let’s Encrypt


## Setup
### Criar máquinas virtuais ubuntu 18.0
- 2fa_server01
- 2fa_server02
- 2fa_loadbalancer
### Instalar git e dar push ao projeto
```
sudo apt-get install -y git
git clone https://github.com/luisfelipeSB/fault_tolerant_2fa_service
```
### Instalar node e npm
```
sudo apt-get update
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install nodejs
sudo apt-get install npm
node --version
```
Instalar as dependências do projeto
```
npm install
```
Executar servidor 
```
node server.js
# stop app
ctrl+C
```
### Instalar e configurar Nginx
Instalar Nginx em todas as máquinas
```
sudo apt-get install nginx
```
Configurar Load Balancer na máquina 2fa_loadbalancer

sudo nano /etc/nginx/sites-available/default
```
upstream www {
server 2fa_server01 private ip weight=1;
server 2fa_server02 private ip weight=5;
}
server {
        listen 80;
        server_name 2fa_loadbalancer ip público;
        location / {
          proxy_pass http://www;
        }
}
```
Dar restart ao Nginx
```
sudo service nginx restart
```
Configurar Reverse Proxy nas máquinas dos servidores

sudo nano /etc/nginx/sites-available/default
```
server_name ip do servidor;

    location / {
        proxy_pass http://localhost:3000; #porta em que o servidor corre
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
```
Dar restart ao Nginx
```
sudo service nginx restart
```
### Adicionar SSL com Let's Encrypt
```
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install python-certbot-nginx
sudo certbot --nginx -d ip do servidor

# Renovar certificado a cada 90 dias
certbot renew --dry-run
```
Não esquecer de ativar a porta 443 nos servidores para aceder ao https!
### Instalar PM2 nos servidores (Opcional)
```
sudo npm i pm2 -g
pm2 start server.js

# Other pm2 commands
pm2 show server.js
pm2 status
pm2 restart server.js
pm2 stop server.js
pm2 logs (Show log stream)
pm2 flush (Clear logs)

# Quando dar reebot o servidor inicializar também
pm2 startup ubuntu (nome da máquina)
```

### Aplicação de Atenticação de TOTP
O código da aplicação de TOTPs está disponível neste repositório. A segurança do sistema depende em haver um código secreto único para cada conta no sistema do serviço. Este código secreto é partilhado com o utilizador no momento em que cria sua conta. O utilizador deverá inserir este código na nossa aplicação de autenticação para começar a usar 2FA. Em síntese, a aplicação se comporta da seguinte forma:

Se não houver um código armazenado em memória persistente do dispositivo, ou seja, se um código válido nunca foi fornecido antes para este dispositivo, o utilizador precisará fornecer um código novo. No momento que o utilizador clicar em "Submit" o código inserido no campo é validado no servidor; o registro do utilizador a qual o código corresponde é analisado. Se o utilizador já tiver habilitado 2FA, a validação falha, pois o código só pode ser armazenado em um único dispositivo. Se esta for a primeira vez que o utilizador tenta habilitar 2FA, o código é validado, e o servidor dá permissão para a aplicação começar a mostrar as TOTPs. O código é armazenado em memória persistente.

A aplicação passa então a pedir novas TOTPs a cada 30s, e se um pedido por TOTP incluir um secret que corresponde a uma conta que já habilitou 2FA, o pedido é correspondido, se não, é ignorado. 

### Base de Dados
Há duas bases de dados no serviço, em uma configuração multi-master, em que qualquer uma das duas pode aceitar transações, e esta transação é replicada na outra. A replicação foi atingida através da ferramenta Bucardo, para Postgresql. Por ser um sistema multi-master, switchovers e failovers não acontecem. O tutorial seguido para a configuração das bases de dados foi: https://www.waytoeasylearn.com/learn/bucardo-installation/. Primeiro foram criadas duas máquinas virtuais no Azure, em uma subnet própria, diferente da dos servidores da aplicação, e criadas as regras nos firewalls para permitir tráfego para port 5432, do serviço Postgresql. Depois foi instalado Postgresql em ambas as máquinas, depois foi instalado Bucardo, e a configuração de replicação foi feita. Por fim, foi adicionado um load balancer que aceita os pedidos de transações dos servidores, e os redireciona para as bases de dados. Se uma base de dados for a baixo, a transação é servida para a outra.
