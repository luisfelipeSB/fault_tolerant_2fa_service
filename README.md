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

<img src="https://github.com/luisfelipeSB/fault_tolerant_2fa_service/blob/main/Documents/arquitetura.png" width="500">

Pretendemos replicar uma vez cada componente do sistema, de forma a provar o conceito mas manter o design e implementação do sistema simples. Isto é, pretendemos implementar o caso específico da arquitetura geral, ilustrado na Fig. 1, para dois reverse proxies, dois servidores, e duas bases de dados, todos virtualizados. As bases de dados existirão em uma VM cada, e os pares de reverse proxies e servidores também. A partilha de VMs dos servidores e proxies é feita para economizar recursos. Um servidor DNS resolverá os IPs dos reverse proxies, um de cada vez, pelo cliente. Os proxies farão o balanceamento de carga. 

Será necessário garantir que a comunicação entre as componentes que passarem por redes seja cifrada, com TLS, com um certificado auto-assinado. As bases de dados estarão encriptadas. Será também necessário garantir que acessos concorrenciais às bases de dados não levem a problemas, e que os estados das bases de dados estejam sincronizados. 



## Tecnologias Usadas
- Azure
- Nginx
- Node.js + Express.js
- PostgreSQL
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
```
Instalar as dependências do projeto
```
npm install
```
Executar servidor 
```
node server.js
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


