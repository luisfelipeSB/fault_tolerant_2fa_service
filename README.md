# Sistema 2FA com aplicação de telemóvel
> Pretendemos através deste projeto implementar um serviço web simples tolerante a faltas e com suporte a autenticação de dois fatores com chaves de uso únicas temporais.
> Demonstração: [link](https://www.twofa.westeurope.cloudapp.azure.com) <!-- If you have the project hosted somewhere, include the link here. -->

## Table of Contents
* [Descrição da Solução](#descrição-da-solução)
* [Tecnologias Usadas](#tecnologias-usadas)
* [Features](#features)
* [Screenshots](#screenshots)
* [Setup](#setup)
* [Usage](#usage)
* [Project Status](#project-status)
* [Room for Improvement](#room-for-improvement)
* [Acknowledgements](#acknowledgements)
* [Contact](#contact)
<!-- * [License](#license) -->


## Descrição da Solução
  Para oferecermos um serviço simples tolerante a faltas e seguro, criaremos um servidor para nossa aplicação com suporte a 2FA, que se comunicará com uma aplicação de autenticação simples para telemóvel, e que será replicado, assim como uma base de dados para armazenar dados de contas, com senhas cifradas. Haverão ainda reverse proxies entre os clientes e servidores, que servirão para balancear carga. Os servidores, bases de dados, e proxies serão replicados em máquinas virtuais. 
  
  Para a seguinte explicação assume-se que o cliente já possui uma conta criada no serviço. No momento que um cliente tentar se conectar a um servidor, um reverse proxy redirecionará o cliente para um servidor com menor carga. Depois que uma conexão for estabelecida, o cliente pedirá a página de login do serviço, e o servidor responderá. O cliente providenciará sua senha e e-mail, e se as credenciais estiverem corretas, prosseguirá para a verificação do TOTP. O servidor enviará a TOTP periódicamente para a aplicação de autenticação no dispositivo, e verificará a TOTP providenciada. Com a autenticação feita, o cliente poderá acessar ao serviço (que será uma tela em branco, com um texto parabenizando o cliente por ter se autenticado corretamente).

<img src="https://github.com/luisfelipeSB/fault_tolerant_2fa_service/blob/main/Documents/arquitetura.png" width="500">

Pretendemos replicar uma vez cada componente do sistema, de forma a provar o conceito mas manter o design e implementação do sistema simples. Isto é, pretendemos implementar o caso específico da arquitetura geral, ilustrado na Fig. 1, para dois reverse proxies, dois servidores, e duas bases de dados, todos virtualizados. As bases de dados existirão em uma VM cada, e os pares de reverse proxies e servidores também. A partilha de VMs dos servidores e proxies é feita para economizar recursos. Um servidor DNS resolverá os IPs dos reverse proxies, um de cada vez, pelo cliente. Os proxies farão o balanceamento de carga. 

Será necessário garantir que a comunicação entre as componentes que passarem por redes seja cifrada, com TLS, com um certificado auto-assinado. As bases de dados estarão encriptadas. Será também necessário garantir que acessos concorrenciais às bases de dados não levem a problemas, e que os estados das bases de dados estejam sincronizados. 



## Tecnologias Usadas
Azure: As máquinas virtuais serão criadas no Azure, no qual, será instalado o sistema operativo linux por ser um sistema mais leve, permitindo assim um melhor desempenho do mesmo.
Nginx: Conhecido como um reverse proxy e load balancer para aplicações TCP e HTTP, permitirá um aumento de performance da aplicação, pois distribuirá o workload do mesmo pelas diferentes replicações do servidor.
Node.js + Express.js: Express.js é uma web framework para node.js. Será usada para a criação da aplicação web.
PostgreSQL: Serviço de base de dados que será utilizado para armazenar a informação dos utilizadores e as suas chaves TOTP respetivas.
Bcrypt: Algoritmo de criptografia hash para a encriptação das passwords dos utilizadores compatível com node.js.[5]
Flutter: Ferramenta open source, criada pela Google para desenvolver aplicações multi- plataforma. Utilizaremos para desenvolver a aplicação de autenticação do telemóvel.
Passport.js + express-session: Passport.js é um middleware de autenticação compatível com node.js e o express-session é um middleware de sessão de cookies. Estes dois juntos formam a estratégia de autenticação utilizada pela nossa aplicação.
CryptoJS + Steel Crypt: Ambos são bibliotecas de algoritmos criptográficos. O primeiro foi utilizado para encriptar os dados do lado do servidor e o segundo para fazer a desencriptação do lado do cliente. O algoritmo AES foi o escolhido para criptografar a maior parte da nossa base de dados.
Otplib: Biblioteca em JavaScript para a geração e verificação de OTP. Foi utilizado o algoritmo RFC 6238 na geração de tokens e um sistema numérico de Base32 na geração de secrets do utilizador. 
Cron: O Cron para Node é um pacote npm que permite fazer o agendamento de tarefas baseado em uma regra de tempo. Foi utilizado na geração e verificação de tokens periodicamente.
Let’s Encrypt: É uma autoridade certificadora gratuita, automatizada e aberta que opera em prol do benefício público.



## Features
List the ready features here:
- Awesome feature 1
- Awesome feature 2
- Awesome feature 3


## Screenshots
![Example screenshot](./img/screenshot.png)
<!-- If you have screenshots you'd like to share, include them here. -->


## Setup
What are the project requirements/dependencies? Where are they listed? A requirements.txt or a Pipfile.lock file perhaps? Where is it located?

Proceed to describe how to install / setup one's local environment / get started with the project.


## Usage
How does one go about using it?
Provide various use cases and code examples here.

`write-your-code-here`


## Project Status
Project is: _in progress_ / _complete_ / _no longer being worked on_. If you are no longer working on it, provide reasons why.


## Room for Improvement
Include areas you believe need improvement / could be improved. Also add TODOs for future development.

Room for improvement:
- Improvement to be done 1
- Improvement to be done 2

To do:
- Feature to be added 1
- Feature to be added 2


## Acknowledgements
Give credit here.
- This project was inspired by...
- This project was based on [this tutorial](https://www.example.com).
- Many thanks to...


## Contact
Created by [@flynerdpl](https://www.flynerd.pl/) - feel free to contact me!


<!-- Optional -->
<!-- ## License -->
<!-- This project is open source and available under the [... License](). -->

<!-- You don't have to include all sections - just the one's relevant to your project -->
