preciso criar um sistema que me ajude com o seguinte problema: Sou professor e agora preciso atualizar frequencias
  no sistema da faculdade(sistema web, sem API, funciona todo com rederização no servidor) O sistema é horrívelmente
  lento, o que me faz perder muito tempo com essa (e outras) atividades repetitivas. Quero criar um sistema que possa
  fazer essas atividades em background para mim. Atualmente o que eu quero é um sistema escrito em typescript com bum.
  Que tenha um frontend com as informações que preciso, que recebe solicitações minhas, mas vá fazendo em
  background(irá usar puppteer ou algo que se encaixe melhor, para manualmente, ver se esta logado, se nao entrar com
  minhas credenciais e fazer as atividades necessaria - listar informações, executar alterações) o grande trunfo é que
  eu poderei realizar várias alterações do meu lado, por exemplo: criar todas as aulas, ou atualizar as frequencias,
  e o sistema vai manualmente ir no sisteam real da faculdade e ir executando, uma a uma, esperando o tempo
  necessário, retentando, caso falhe. E eu terei a visibilidade do que foi feito, do que nao esta feito, do que esta
  sendo feito e o que falhou após 3 tentativas. Também gostaria de ter um botão para sincronizar o estado manual. Será
  importante gravar as alterações locais e que o sistema possa fazer o diff do que tem para ser feito. O link do
  site(principal) para fazer login é: https://www.studus.com.br/StudusFIP/login.xhtml. para entrar na area do
  professor é necessario clicar em /html/body/div[1]/div[2]/div/ul/li[2]/a que abre a area do professor. com ela
  aberta clicar em /html/body/div[1]/div[2]/div/div/div[2]/div[2]/div/div[1]/form/ul/li/a/span[1] que vai abrir todas
  as cadeiras que tenho. para essa primeira versao, deixe toda a logica necessaria, mas vamos trabalhar so com logar e
  pegar as cadeiras que tenho, por hora sem outra ação. Deixe todo o contexto que for descrobrindo salvo em um
  arquivo .md
