#!/usr/bin/env perl
use strict;
use warnings;
use utf8;
use feature 'say';
use DBI;
use Mojo::DOM;
binmode(STDOUT, ":unix:utf8");

my ($filename, $out_file)   = @ARGV;
unless (defined $filename and -f $filename){
	say "Error with filename to parse.\nExited.";
	exit();
}

my $content = "";
open(my $fh, '<:encoding(UTF-8)', $filename) or die "$filename: $!";
read($fh, $content, -s $fh);
close $fh;

if (!$out_file) {
	$out_file = substr($filename , 0, -4)."xml";
}

my $dom = Mojo::DOM->new($content);
 # remove head section
$dom->find('head')->map('remove');

# processing footnotes
my %ftn = ();
# div id=ftn1
my $div = 1;
while () {
  # say "div #".$div;
  my $res = $dom->at('div#ftn'.$div);
  if ($res) {
	$res->find('div,p,span')->map('strip');
	$res->find('a')->map('remove');
	my $note  = $res->content;
	
	$note =~ s/^\s+|\s+$//;
	# say $note;
	$ftn{$div} = $note;	
	$res->remove();
	$div++;
  } else {
	# say "no";
	last;  
  }
}

# say %ftn;
# $dom->find('p.MsoFootnoteText')->each(sub {
		# my $id  = $_->at('span.MsoFootnoteReference')->all_text;
		# # $id =~  s/\[|\]//g;
		# $_->find('p,span')->map('strip');
		# $_->find('a')->map('remove');
		# my $note  = $_->content;
		# $id =~ s/^\s+|\s+$//;
		# $note =~ s/^\s+|\s+$//;
		# $ftn{$id} = $note;
		# $_->remove();
# });

# process links
$dom->find('a')->each(sub {
	if ($_->{name}){
		if ($_->{name}=~ m/_ftnref/g){
			my $id = $_->all_text;
			$id =~ s/^\s+|\s+$//;
			$id =~  s/\[|\]//g;
			# say "id->".$id;
			$_->replace('<pub>'.$ftn{$id}.'</pub>')
		} else {
			# <a name="__DdeLink__656_2759041894"></a>
			# say $_;
			# $_->replace($_->all_text);
			$_->strip;
		}
	}
});

# removing meaningless attributes & adding custom tags
$dom->find('*')->each(sub {
   delete $_->{class};
   delete $_->{lang};
   if ($_->{style}) {
		if ($_->{style} =~ m/Fedorovsk/){
			$_->tag('cyr');
		}
		delete $_->{style};
   }
});

# removing meaningless tags
$dom->find('span,p,h1,div,br,hr,html,body')->map('strip');
# serializing
my $str  = $dom->to_string;

# removing blank lines
$str =~ s/^\s*\n//mg;
$str =~ s/\<\/cyr\>\<cyr\>//g;
# $str =~ s/\n/ /g;
# $str =~ s/(?=\[)/\n/g;
# $str =~ s/(?<=\])/\n/g;

open my $ind, '>:encoding(UTF-8)', $out_file;
print $ind $str;