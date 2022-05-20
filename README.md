# Sistema 2FA com aplicação de telemóvel
> Pretendemos através deste projeto implementar um serviço web simples tolerante a faltas e com suporte a autenticação de dois fatores com chaves de uso únicas temporais.
> Demonstração: [link](https://www.twofa.westeurope.cloudapp.azure.com) <!-- If you have the project hosted somewhere, include the link here. -->

## Table of Contents
* [Descrição da Solução](#descrição-da-solução)
* [Technologies Used](#technologies-used)
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


## Technologies Used
- Tech 1 - version 1.0
- Tech 2 - version 2.0
- Tech 3 - version 3.0


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
